#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "GameFramework/GameModeBase.h"
#include "GameFramework/HUD.h"
#include "DOSExplorer.generated.h"

class UCameraComponent;
class AStaticMeshActor;

struct FDOSExhibit
{
    FString Title, Body, Activity, Explanation, URL, Source;
    TArray<FString> Choices;
    int32 Answer = 1;
};

UCLASS()
class DOSEXPLORER_API ADOSVisitor : public ACharacter
{
    GENERATED_BODY()
public:
    ADOSVisitor();
    virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
private:
    UPROPERTY() UCameraComponent* Camera;
    void Forward(float Value);
    void Right(float Value);
    void LookX(float Value);
    void LookY(float Value);
    void Interact();
    void Close();
    void Next();
    void Home();
    void OpenSource();
    void AnswerOne();
    void AnswerTwo();
};

UCLASS()
class DOSEXPLORER_API ADOSGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    ADOSGameMode();
    virtual void BeginPlay() override;
    virtual void RestartPlayer(AController* NewPlayer) override;
    TArray<FDOSExhibit> Exhibits;
    TSet<int32> Visited, Completed;
    int32 Active = INDEX_NONE;
    int32 GuideIndex = INDEX_NONE;
    FString Feedback, SetupError;
    UPROPERTY() AStaticMeshActor* Office = nullptr;
    int32 Nearest(const APawn* Pawn) const;
    void Interact(APawn* Pawn);
    void Close();
    void Answer(int32 Choice);
    void Travel(APawn* Pawn, int32 Index);
    void OpenSource();
};

UCLASS()
class DOSEXPLORER_API ADOSHUD : public AHUD
{
    GENERATED_BODY()
public:
    virtual void DrawHUD() override;
private:
    void Paragraph(const FString& Text, float X, float& Y, float Width, float Scale, FLinearColor Color);
};
