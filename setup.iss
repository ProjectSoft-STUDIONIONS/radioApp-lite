#include "version.iss"  

#define DirName 'YourRadioLight'

#define RadioAppName "Your Radio Light"
#define RadioAppPublisher "ProjectSoft"
#define RadioAppURL "https://github.com/ProjectSoft-STUDIONIONS/radioApp-lite"
#define RadioAppSupportURL "https://github.com/ProjectSoft-STUDIONIONS/radioApp-lite/issues"
#define RadioAppUpdateURL "https://github.com/ProjectSoft-STUDIONIONS/radioApp-lite/releases/latest"
#define RadioAppExeName "YourRadio.exe"
#define ToastAppID "YourRadio.DesktopNotification.Sample"

[Setup]
AppId={{9EA71393-889E-490E-84DC-266FF93269F5}
AppName=Ваше Радио Light
AppVersion={#RadioAppVersion}
AppVerName=Ваше Радио Light {#RadioAppVersion}
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
VersionInfoDescription=Ваше Радио Light {#RadioAppVersion}
VersionInfoProductName=Ваше Радио Light {#RadioAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
CloseApplications=force
MissingRunOnceIdsWarning=no
UsedUserAreasWarning=no
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"

[CustomMessages]
english.AppName=Your Radio Light
russian.AppName=Ваше Радио Light
english.ProgramName=Your Radio Light
russian.ProgramName=Ваше Радио Light
english.StopProgramm=Stop «Your Radio Light»...
russian.StopProgramm=Остановить «Ваше Радио Light»...

[Files]
Source: "build\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Registry]
; Настройки уведомлений — удаляем ветку целиком
; LastNotificationAddedTime = 134379846401453395
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\YourRadio.DesktopNotification.Sample"; ValueType: dword; ValueName: "ShowBanner"; ValueData: 1
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\YourRadio.DesktopNotification.Sample"; ValueType: dword; ValueName: "Rank"; ValueData: 99
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\YourRadio.DesktopNotification.Sample"; ValueType: dword; ValueName: "Enabled"; ValueData: 1
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\YourRadio.DesktopNotification.Sample"; ValueType: dword; ValueName: "AllowContentAboveLock"; ValueData: 1
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\YourRadio.DesktopNotification.Sample"; ValueType: dword; ValueName: "ShowInActionCenter"; ValueData: 0
; Удаляем ветку целиком при деинсталляции
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\YourRadio.DesktopNotification.Sample"; Flags: uninsdeletekey

; AppUserModelId — тоже целиком
Root: HKCU; Subkey: "Software\Classes\AppUserModelId\YourRadio.DesktopNotification.Sample"; ValueType: string; ValueName: "DisplayName"; ValueData: "{cm:AppName}"
Root: HKCU; Subkey: "Software\Classes\AppUserModelId\YourRadio.DesktopNotification.Sample"; ValueType: string; ValueName: "IconUri"; ValueData: "{app}\favicon.png"
; Удаляем ветку целиком
Root: HKCU; Subkey: "Software\Classes\AppUserModelId\YourRadio.DesktopNotification.Sample"; Flags: uninsdeletekey

[UninstallDelete]
Type: filesandordirs; Name: {autopf}\{cm:ProgramName}
Type: filesandordirs; Name: {localappdata}\YourRadio      

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM YourRadio.exe /T"; Flags: runhidden waituntilterminated; StatusMsg: "{cm:StopProgramm}"

[Icons]
Name: "{autoprograms}\{cm:ProgramName}"; Filename: "{app}\{#RadioAppExeName}"; AppUserModelID: "{#ToastAppID}"
Name: "{autodesktop}\{cm:ProgramName}"; Filename: "{app}\{#RadioAppExeName}"

[Code]
procedure RemoveLocalAppData();
var
  LocalAppDataPath: string;
begin
  LocalAppDataPath := ExpandConstant('{localappdata}\YourRadio');
  if DirExists(LocalAppDataPath) then
    DelTree(LocalAppDataPath, True, True, True); // True = удалить и папку, и содержимое
end;

procedure CurUninstallStepChanged(CurStep: TUninstallStep);
begin
  if CurStep = usPostUninstall then
    RemoveLocalAppData();
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
begin
  Result := '';
  Exec(ExpandConstant('{sys}\taskkill.exe'),
       '/F /IM YourRadio.exe /T',
       '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(1000); // даём файлам освободиться
end;
