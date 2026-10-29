program toast;

{$APPTYPE CONSOLE}

{$R *.res}

uses
  System.SysUtils,
  WinAPI.WinRT,
  WinAPI.DataRT,
  WinAPI.UI.Notifications,
  WinAPI.ActiveX,
  WinAPI.CommonTypes,
  System.Win.ComObj,
  Windows;

// --- Утилиты ---

function FileUri(const Path: string): string;
begin
  if (Pos('://', Path) > 0) or (Pos('file://', Path) = 1) then
    Result := Path
  else
    Result := 'file:///' + StringReplace(Path, '\', '/', [rfReplaceAll]);
end;

function HStr(const Value: string): HSTRING;
begin
  if not Succeeded(WindowsCreateString(PWideChar(Value), Length(Value), Result)) then
    raise Exception.CreateFmt('Unable to create HString for %s', [Value]);
end;

function GetFactory(const Name, GUIDStr: string): IInspectable;
var
  FactoryHString: HSTRING;
  FactoryGUID: TGUID;
begin
  FactoryHString := HStr(Name);
  try
    FactoryGUID := TGUID.Create(GUIDStr);
    if not Succeeded(RoGetActivationFactory(FactoryHString, FactoryGUID, Result)) then
      raise Exception.CreateFmt('Error creating factory: %s %s', [Name, GUIDStr]);
  finally
    WindowsDeleteString(FactoryHString);
  end;
end;

// --- Парсинг аргументов ---

procedure ParseArgs(
  out Station, Track, IconUrl, StationImgUrl: string
);
var
  i: Integer;
begin
  Station := '';
  Track := '';
  IconUrl := '';
  StationImgUrl := '';

  for i := 1 to ParamCount do
  begin
    if (i < ParamCount) and (LowerCase(ParamStr(i)) = '-t') then
      Station := ParamStr(i + 1)
    else if (i < ParamCount) and (LowerCase(ParamStr(i)) = '-d') then
      Track := ParamStr(i + 1)
    else if (i < ParamCount) and (LowerCase(ParamStr(i)) = '-i') then
      IconUrl := ParamStr(i + 1)
    else if (i < ParamCount) and (LowerCase(ParamStr(i)) = '-p') then
      StationImgUrl := ParamStr(i + 1);
  end;
end;

// --- Генерация XML ---

function BuildToastXml(
  const StationName, TrackName, AppIconUri, StationImageUri: string
): string;
var
  HeroImagePart: string;
begin
  // Если картинка станции есть — добавляем hero-image, если нет — оставляем пустым
  if StationImageUri <> '' then
    HeroImagePart := '<image placement="hero" src="%s"/>'
  else
    HeroImagePart := '';

  Result :=
    '<toast tag="current-track" group="radio-app" activationType="foreground">' +
    '  <visual>' +
    '    <binding template="ToastGeneric">' +
    '      <text hint-style="title">%s</text>' +
    '      <text>%s</text>' +
    '      <image placement="appLogoOverride" src="%s"/>' +
    HeroImagePart +
    '    </binding>' +
    '  </visual>' +
    '  <actions>' +
    '    <action content="Слушать" activationType="foreground" arguments=""/>' +
    '  </actions>' +
    '</toast>';

  // Подставляем значения. Если StationImageUri пустой, HeroImagePart будет пустой строкой — тега не будет
  if StationImageUri <> '' then
    Result := Format(Result, [StationName, TrackName, AppIconUri, StationImageUri])
  else
    Result := Format(Result, [StationName, TrackName, AppIconUri]);
end;

// --- Показ тоаста ---

procedure ShowRadioToast(
  const StationName, TrackName, AppIconUri, StationImageUri: string
);
const
  SToastNotificationManager = 'Windows.UI.Notifications.ToastNotificationManager';
  CLSID_ToastNotificationManager = '{50AC103F-D235-4598-BBEF-98FE4D1A3AD4}';
  SToastNotification = 'Windows.UI.Notifications.ToastNotification';
  CLSID_ToastNotification = '{04124B20-82C6-4229-B109-FD9ED4662B53}';
  FixedAppID = 'YourRadio.app';
var
  ToastManagerFactory, ToastFactory: IInspectable;
  ToastStatics: IToastNotificationManagerStatics;
  ToastTemplate: Xml_Dom_IXmlDocument;
  ToastNotifierObj: IToastNotifier;
  ToastNotificationObj: IToastNotification;
  XmlStr: string;
  hAppID: HSTRING;
begin
  if TOSVersion.Major < 10 then
    Exit;

  RoInitialize(RO_INIT_MULTITHREADED);

  ToastManagerFactory := GetFactory(SToastNotificationManager, CLSID_ToastNotificationManager);
  ToastStatics := IToastNotificationManagerStatics(ToastManagerFactory);

  ToastTemplate := ToastStatics.GetTemplateContent(ToastTemplateType.ToastText01);

  XmlStr := BuildToastXml(StationName, TrackName, AppIconUri, StationImageUri);

  (ToastTemplate as Xml_Dom_IXmlDocumentIO).LoadXml(HStr(XmlStr));

  ToastFactory := GetFactory(SToastNotification, CLSID_ToastNotification);
  ToastNotificationObj := IToastNotificationFactory(ToastFactory).CreateToastNotification(ToastTemplate);

  hAppID := HStr(FixedAppID);
  try
    ToastNotifierObj := ToastStatics.CreateToastNotifier(hAppID);
    ToastNotifierObj.Show(ToastNotificationObj);
  finally
    WindowsDeleteString(hAppID);
  end;
end;

// --- Main ---



var
  Station, Track, IconUrl, StationImgUrl: string;
begin
  try
    ParseArgs(Station, Track, IconUrl, StationImgUrl);

    // Обязательные параметры: станция, трек, иконка. Без них смысла в тоасте нет.
    if (Station = '') or (Track = '') or (IconUrl = '') then
      Exit;

    ShowRadioToast(
      Station,
      Track,
      FileUri(IconUrl),
      FileUri(StationImgUrl)
    );
  except
    on E: Exception do
    begin
      // В фоне просто игнорируем, чтобы NWJS не падал
    end;
  end;
end.

