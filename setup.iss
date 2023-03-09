#define RadioAppName "Your Radio Lite"
#define RadioAppVersion "2.0.0"
#define RadioAppPublisher "ProjectSoft"
#define RadioAppURL "https://github.com/ProjectSoft-STUDIONIONS/radioApp-lite"
#define RadioAppExeName "YourRadio.exe"

[Setup]
AppId={{9EA71393-889E-490E-84DC-266FF93269F5}
AppName={#RadioAppName}
AppVersion={#RadioAppVersion}
AppVerName={#RadioAppName} {#RadioAppVersion}
AppPublisher={#RadioAppPublisher}
AppPublisherURL={#RadioAppURL}
AppSupportURL={#RadioAppURL}
AppUpdatesURL={#RadioAppURL}
AppCopyright={#RadioAppPublisher}
VersionInfoVersion={#RadioAppVersion}
DefaultDirName={autopf}\{#RadioAppName}
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputDir=setup
OutputBaseFilename=YourRadioLiteSetup
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
english.RunProgramm=Launch application «Your Radio v{#RadioAppVersion}»  
russian.RunProgramm=Запустить «Ваше Радио v{#RadioAppVersion}»
english.StopProgramm=Stop «Your Radio»...
russian.StopProgramm=Стоп «Ваше Радио»...

[Files]
Source: "build\normal\YourRadio\win32\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
Filename: "{app}\{#RadioAppExeName}"; Flags: postinstall nowait skipifsilent; Description: "{cm:RunProgramm}";

[UninstallDelete]
Type: filesandordirs; Name: {autopf}\{#RadioAppName}
Type: filesandordirs; Name: {localappdata}\YourRadio

[UninstallRun]
Filename: {sys}\taskkill.exe; Parameters: "/F /IM YourRadio.exe /T"; Flags: skipifdoesntexist runhidden waituntilterminated; StatusMsg: "{cm:StopProgramm}"

[Icons]
Name: "{autoprograms}\{#RadioAppName}"; Filename: "{app}\{#RadioAppExeName}"
Name: "{autodesktop}\{#RadioAppName}"; Filename: "{app}\{#RadioAppExeName}"
