#include "DOSExplorer.h"
#include "Modules/ModuleManager.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/StaticMesh.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Kismet/GameplayStatics.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "HAL/PlatformProcess.h"

IMPLEMENT_PRIMARY_GAME_MODULE(FDefaultGameModuleImpl, DOSExplorer, "DOSExplorer");

static ADOSGameMode* Mode(const AActor* Actor)
{
    return Cast<ADOSGameMode>(UGameplayStatics::GetGameMode(Actor));
}

ADOSVisitor::ADOSVisitor()
{
    GetCapsuleComponent()->InitCapsuleSize(32.f, 90.f);
    GetCharacterMovement()->MaxWalkSpeed = 260.f;
    GetCharacterMovement()->MaxStepHeight = 25.f;
    bUseControllerRotationYaw = true;
    Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("VisitorCamera"));
    Camera->SetupAttachment(GetCapsuleComponent());
    Camera->SetRelativeLocation(FVector(0, 0, 72));
    Camera->bUsePawnControlRotation = true;
    Camera->FieldOfView = 85;
}

void ADOSVisitor::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis("Forward", this, &ADOSVisitor::Forward);
    Input->BindAxis("Right", this, &ADOSVisitor::Right);
    Input->BindAxis("LookX", this, &ADOSVisitor::LookX);
    Input->BindAxis("LookY", this, &ADOSVisitor::LookY);
    Input->BindAction("Interact", IE_Pressed, this, &ADOSVisitor::Interact);
    Input->BindAction("Close", IE_Pressed, this, &ADOSVisitor::Close);
    Input->BindAction("Next", IE_Pressed, this, &ADOSVisitor::Next);
    Input->BindAction("Home", IE_Pressed, this, &ADOSVisitor::Home);
    Input->BindAction("Source", IE_Pressed, this, &ADOSVisitor::OpenSource);
    Input->BindAction("One", IE_Pressed, this, &ADOSVisitor::AnswerOne);
    Input->BindAction("Two", IE_Pressed, this, &ADOSVisitor::AnswerTwo);
}
void ADOSVisitor::Forward(float V) { if (const auto* M=Mode(this); M && M->Active==INDEX_NONE) AddMovementInput(GetActorForwardVector(),V); }
void ADOSVisitor::Right(float V) { if (const auto* M=Mode(this); M && M->Active==INDEX_NONE) AddMovementInput(GetActorRightVector(),V); }
void ADOSVisitor::LookX(float V) { if (const auto* M=Mode(this); M && M->Active==INDEX_NONE) AddControllerYawInput(V); }
void ADOSVisitor::LookY(float V) { if (const auto* M=Mode(this); M && M->Active==INDEX_NONE) AddControllerPitchInput(V); }
void ADOSVisitor::Interact() { if(auto* M=Mode(this)) M->Interact(this); }
void ADOSVisitor::Close() { if(auto* M=Mode(this)) M->Close(); }
void ADOSVisitor::Next() { if(auto* M=Mode(this); M && M->Exhibits.Num()) { M->GuideIndex=(M->GuideIndex+1)%M->Exhibits.Num(); M->Travel(this,M->GuideIndex); } }
void ADOSVisitor::Home() { if(auto* M=Mode(this)) { M->GuideIndex=INDEX_NONE; M->Travel(this,INDEX_NONE); } }
void ADOSVisitor::OpenSource() { if(auto* M=Mode(this)) M->OpenSource(); }
void ADOSVisitor::AnswerOne() { if(auto* M=Mode(this)) M->Answer(1); }
void ADOSVisitor::AnswerTwo() { if(auto* M=Mode(this)) M->Answer(2); }

ADOSGameMode::ADOSGameMode()
{
    DefaultPawnClass=ADOSVisitor::StaticClass();
    HUDClass=ADOSHUD::StaticClass();
}

void ADOSGameMode::BeginPlay()
{
    Super::BeginPlay();
    FString Json;
    TSharedPtr<FJsonObject> Root;
    if (!FFileHelper::LoadFileToString(Json, *(FPaths::ProjectContentDir()/TEXT("Data/exhibits.json"))) ||
        !FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Json), Root) || !Root.IsValid())
    {
        SetupError=TEXT("Exhibit data is missing or invalid. Restore Content/Data/exhibits.json.");
        return;
    }
    const TArray<TSharedPtr<FJsonValue>>* Items=nullptr;
    if(!Root->TryGetArrayField(TEXT("exhibits"), Items)) { SetupError=TEXT("Missing exhibits array."); return; }
    for (const auto& Value : *Items)
    {
        const auto Obj=Value->AsObject();
        FDOSExhibit E;
        const TArray<TSharedPtr<FJsonValue>>* Choices=nullptr;
        if(!Obj.IsValid() || !Obj->TryGetStringField(TEXT("title"),E.Title) ||
           !Obj->TryGetStringField(TEXT("body"),E.Body) || !Obj->TryGetStringField(TEXT("activity"),E.Activity) ||
           !Obj->TryGetStringField(TEXT("explanation"),E.Explanation) || !Obj->TryGetStringField(TEXT("url"),E.URL) ||
           !Obj->TryGetStringField(TEXT("source_label"),E.Source) || !Obj->TryGetNumberField(TEXT("answer"),E.Answer) ||
           !Obj->TryGetArrayField(TEXT("choices"),Choices) || Choices->Num()!=2 || E.Answer<1 || E.Answer>2)
        { SetupError=TEXT("Invalid exhibit. Check the JSON schema using scripts/validate_project.py."); return; }
        for(const auto& C:*Choices) E.Choices.Add(C->AsString());
        Exhibits.Add(E);
    }
    for(TActorIterator<AStaticMeshActor> It(GetWorld()); It; ++It)
        if(It->ActorHasTag(TEXT("DOSOffice"))) { Office=*It; break; }
    if(!Office || !Office->GetStaticMeshComponent()->DoesSocketExist(TEXT("Start")))
    { SetupError=TEXT("Office not imported. Run Content/Python/import_office.py in Unreal Editor, then open DOS_Office."); return; }
    for(int32 I=0; I<Exhibits.Num(); ++I)
    {
        if(!Office->GetStaticMeshComponent()->DoesSocketExist(FName(*FString::Printf(TEXT("Station_%d"),I))) ||
           !Office->GetStaticMeshComponent()->DoesSocketExist(FName(*FString::Printf(TEXT("Focus_%d"),I))))
        { SetupError=TEXT("Exhibit sockets missing from the imported FBX. Re-run import_office.py."); return; }
    }
    if(auto* PC=UGameplayStatics::GetPlayerController(this,0))
    {
        PC->SetInputMode(FInputModeGameOnly());
        PC->bShowMouseCursor=false;
        Travel(PC->GetPawn(),INDEX_NONE);
    }
}

void ADOSGameMode::RestartPlayer(AController* NewPlayer)
{
    Super::RestartPlayer(NewPlayer);
    if(Office && NewPlayer) Travel(NewPlayer->GetPawn(),INDEX_NONE);
}

int32 ADOSGameMode::Nearest(const APawn* Pawn) const
{
    if(!Office || !Pawn || !SetupError.IsEmpty()) return INDEX_NONE;
    float Best=220.f; int32 Index=INDEX_NONE;
    for(int32 I=0; I<Exhibits.Num(); ++I)
    {
        const FVector P=Office->GetStaticMeshComponent()->GetSocketLocation(FName(*FString::Printf(TEXT("Station_%d"),I)));
        const float D=FVector::Dist2D(P,Pawn->GetActorLocation());
        if(D<Best) {Best=D; Index=I;}
    }
    return Index;
}
void ADOSGameMode::Interact(APawn* Pawn)
{
    if(Active!=INDEX_NONE) {Close(); return;}
    Active=Nearest(Pawn);
    if(Active!=INDEX_NONE)
    {
        Visited.Add(Active); Feedback.Empty();
        if(auto* C=Cast<ACharacter>(Pawn)) C->GetCharacterMovement()->StopMovementImmediately();
    }
}
void ADOSGameMode::Close() { Active=INDEX_NONE; Feedback.Empty(); }
void ADOSGameMode::Answer(int32 Choice)
{
    if(!Exhibits.IsValidIndex(Active)) return;
    if(Choice==Exhibits[Active].Answer) {Completed.Add(Active); Feedback=Exhibits[Active].Explanation;}
    else Feedback=TEXT("Try again. Re-read the exhibit, then choose 1 or 2.");
}
void ADOSGameMode::Travel(APawn* Pawn,int32 Index)
{
    if(!Pawn || !Office || !SetupError.IsEmpty()) return;
    Close();
    const FName Position=Index==INDEX_NONE? FName(TEXT("Start")):FName(*FString::Printf(TEXT("Station_%d"),Index));
    const FName Focus=Index==INDEX_NONE? FName(TEXT("StartFocus")):FName(*FString::Printf(TEXT("Focus_%d"),Index));
    const auto* Mesh=Office->GetStaticMeshComponent();
    const FVector P=Mesh->GetSocketLocation(Position);
    const FVector F=Mesh->GetSocketLocation(Focus);
    const FRotator Rotation(0,(F-P).Rotation().Yaw,0);
    if(auto* C=Cast<ACharacter>(Pawn)) C->GetCharacterMovement()->StopMovementImmediately();
    Pawn->TeleportTo(P,Rotation);
    if(Pawn->GetController()) Pawn->GetController()->SetControlRotation(Rotation);
}
void ADOSGameMode::OpenSource()
{
    if(!Exhibits.IsValidIndex(Active)) return;
    const FString& URL=Exhibits[Active].URL;
    if(URL.StartsWith(TEXT("https://www.singstat.gov.sg/")) || URL.StartsWith(TEXT("https://tablebuilder.singstat.gov.sg/")))
    { FPlatformProcess::LaunchURL(*URL,nullptr,nullptr); Feedback=TEXT("Opening the official website in your browser. Internet access is required."); }
}

void ADOSHUD::Paragraph(const FString& Text,float X,float& Y,float Width,float Scale,FLinearColor Color)
{
    TArray<FString> Words; Text.ParseIntoArrayWS(Words);
    FString Line;
    for(const FString& Word:Words)
    {
        const FString Candidate=Line.IsEmpty()? Word:Line+TEXT(" ")+Word;
        float W,H; GetTextSize(Candidate,W,H,GEngine->GetMediumFont(),Scale);
        if(W>Width && !Line.IsEmpty()) {DrawText(Line,Color,X,Y,GEngine->GetMediumFont(),Scale);Y+=25*Scale;Line=Word;}
        else Line=Candidate;
    }
    if(!Line.IsEmpty()) {DrawText(Line,Color,X,Y,GEngine->GetMediumFont(),Scale);Y+=25*Scale;}
    Y+=10*Scale;
}

void ADOSHUD::DrawHUD()
{
    Super::DrawHUD();
    auto* M=Mode(this); if(!M || !Canvas) return;
    const float W=Canvas->SizeX,H=Canvas->SizeY;
    const float S=FMath::Min(W/1280.f,H/900.f);
    const FLinearColor White(.94f,.96f,.95f), Mint(.3f,.85f,.78f), Dark(.015f,.035f,.065f,.97f);
    DrawRect(Dark,0,0,W,84*S);
    DrawText(TEXT("DOS  /  DISCOVERY OFFICE"),White,30*S,18*S,GEngine->GetMediumFont(),1.25*S);
    DrawText(TEXT("Conceptual visitor floor"),Mint,30*S,51*S,GEngine->GetMediumFont(),.8*S);
    DrawText(FString::Printf(TEXT("Explored %d/%d    Activities %d/%d"),M->Visited.Num(),M->Exhibits.Num(),M->Completed.Num(),M->Exhibits.Num()),White,W-365*S,28*S,GEngine->GetMediumFont(),S);
    DrawRect(Dark,0,H-62*S,W,62*S);
    DrawText(TEXT("WASD / arrows: move   Mouse: look   E: explore / close   G: next gallery   H: reception   Q: close"),White,30*S,H-42*S,GEngine->GetMediumFont(),.9*S);
    if(!M->SetupError.IsEmpty()) {float Y=160*S; Paragraph(M->SetupError,60*S,Y,W-120*S,1.2*S,White);return;}
    if(M->Active==INDEX_NONE)
    {
        DrawRect(Mint,W/2-2,H/2-2,4,4);
        const int32 Near=M->Nearest(GetOwningPawn());
        if(M->Exhibits.IsValidIndex(Near))
        {
            DrawRect(Dark,W*.22f,H-145*S,W*.56f,60*S);
            DrawText(TEXT("E  /  ")+M->Exhibits[Near].Title,Mint,W*.24f,H-126*S,GEngine->GetMediumFont(),S);
        }
        else DrawText(TEXT("Press G for a guided visit to the four galleries."),White,30*S,110*S,GEngine->GetMediumFont(),S);
        if(M->Completed.Num()==M->Exhibits.Num() && M->Exhibits.Num()>0)
            DrawText(TEXT("Visit complete. Continue exploring, or press H to return to reception."),Mint,30*S,148*S,GEngine->GetMediumFont(),S);
        return;
    }
    const auto& E=M->Exhibits[M->Active];
    const float PanelW=FMath::Min(W-70*S,1120*S),X=(W-PanelW)/2;
    DrawRect(Dark,X,115*S,PanelW,H-220*S);
    DrawRect(Mint,X,115*S,5*S,H-220*S);
    float Y=145*S;
    Paragraph(E.Title,X+32*S,Y,PanelW-64*S,1.5*S,Mint);
    Paragraph(E.Body,X+32*S,Y,PanelW-64*S,1.1*S,White);
    Y+=8*S;
    Paragraph(E.Activity,X+32*S,Y,PanelW-64*S,1.12*S,Mint);
    for(int32 I=0; I<E.Choices.Num(); ++I)
        Paragraph(FString::Printf(TEXT("[%d]  %s"),I+1,*E.Choices[I]),X+32*S,Y,PanelW-64*S,S,White);
    if(!M->Feedback.IsEmpty()) Paragraph(M->Feedback,X+32*S,Y,PanelW-64*S,S,Mint);
    Paragraph(TEXT("Source: ")+E.Source+TEXT("  |  Content reviewed 20 Sep 2026"),X+32*S,Y,PanelW-64*S,.85*S,White);
    Paragraph(TEXT("F: open official resource (internet required)   E / Q: return to office"),X+32*S,Y,PanelW-64*S,.9*S,Mint);
}
