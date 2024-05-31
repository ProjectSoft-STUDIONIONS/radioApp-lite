#include "version.iss"  

#define RadioAppName "Your Radio Light"
#define RadioAppPublisher "ProjectSoft"
#define RadioAppURL "https://github.com/ProjectSoft-STUDIONIONS/radioApp-lite"
#define RadioAppSupportURL "https://github.com/ProjectSoft-STUDIONIONS/radioApp-lite/issues"
#define RadioAppUpdateURL "https://github.com/ProjectSoft-STUDIONIONS/radioApp-lite/releases/latest"
#define RadioAppExeName "YourRadio.exe"

[Setup]
AppId={{9EA71393-889E-490E-84DC-266FF93269F5}
AppName={cm:AppName}
AppVersion={#RadioAppVersion}
AppVerName={cm:AppName} {#RadioAppVersion}
AppPublisher={#RadioAppPublisher}
AppPublisherURL={#RadioAppURL}
AppSupportURL={#RadioAppSupportURL}
AppUpdatesURL={#RadioAppUpdateURL}
AppCopyright={#RadioAppPublisher}
VersionInfoVersion={#RadioAppVersion}
DefaultDirName={autopf}\{#RadioAppName}
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputDir=setup
OutputBaseFilename=YourRadioLightSetup
SetupIconFile=application\favicon.ico
UninstallDisplayIcon={app}\{#RadioAppExeName}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
CloseApplications=force
MissingRunOnceIdsWarning=no
UsedUserAreasWarning=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"

[CustomMessages]
english.AppName=Your Radio Light
russian.AppName=Ваше Радио Light
english.RunProgramm=Launch application «Your Radio Light» v{#RadioAppVersion}  
russian.RunProgramm=Запустить приложение «Ваше Радио Light» v{#RadioAppVersion}  
english.ProgramName=Your Radio Light
russian.ProgramName=Ваше Радио Light
english.StopProgramm=Stop «Your Radio Light»...
russian.StopProgramm=Остановить «Ваше Радио Light»...

[Files]
Source: "build\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
Filename: "{app}\{#RadioAppExeName}"; Flags: postinstall nowait skipifsilent; Description: "{cm:RunProgramm}";

[UninstallDelete]
Type: filesandordirs; Name: {autopf}\{cm:ProgramName}
Type: filesandordirs; Name: {localappdata}\YourRadio      

[UninstallRun]
Filename: {sys}\taskkill.exe; Parameters: "/F /IM YourRadio.exe /T"; Flags: skipifdoesntexist runhidden waituntilterminated; StatusMsg: "{cm:StopProgramm}"

[Icons]
Name: "{autoprograms}\{cm:ProgramName}"; Filename: "{app}\{#RadioAppExeName}"
Name: "{autodesktop}\{cm:ProgramName}"; Filename: "{app}\{#RadioAppExeName}"
