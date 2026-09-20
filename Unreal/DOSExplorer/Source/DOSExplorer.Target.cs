using UnrealBuildTool;
using System.Collections.Generic;
public class DOSExplorerTarget : TargetRules
{
    public DOSExplorerTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        ExtraModuleNames.Add("DOSExplorer");
    }
}
