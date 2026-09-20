using UnrealBuildTool;
using System.Collections.Generic;
public class DOSExplorerEditorTarget : TargetRules
{
    public DOSExplorerEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        ExtraModuleNames.Add("DOSExplorer");
    }
}
