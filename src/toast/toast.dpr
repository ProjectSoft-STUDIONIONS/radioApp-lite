program toast;

{$APPTYPE GUI}

{$R *.res}

uses
  Classes,
  System.SysUtils,
  WinAPI.WinRT,
  WinAPI.DataRT,
  WinAPI.UI.Notifications,
  WinAPI.ActiveX,
  WinAPI.PropKey,
  WinAPI.PropSys,
 // WinAPI.ShlObj,
//  System.Win.ComObj,
  System.Win.Registry,
  Windows;

// ============================================================
//  КОНСТАНТЫ
// ============================================================
const
  // Уникальный AppUserModelID. Он же прописывается в ярлык.
  // Должен совпадать ВЕЗДЕ — иначе Windows не поймёт, чей это тоаст.
  FIXED_APP_ID = 'YourRadio.DesktopNotification.Sample';
  // Перезапись: одинаковые Tag+Group => новый Show ЗАМЕНЯЕТ предыдущий тоаст.
  // Tag ограничен 16 символами (на свежих сборках — 64).
  TOAST_TAG   = 'current-track';
  TOAST_GROUP = 'radio-app';
  // Иконка для шапки тоаста (png или ico). Можно положить рядом с exe.
  APP_ICON_PATH = 'favicon.png';

// ============================================================
//  УТИЛИТЫ
// ============================================================

// Экранируем спецсимволы: иначе "&" или "<" в названии трека сломает XML,
// и тоаст молча не покажется.
function EscapeXml(const S: string): string;
begin
  Result := StringReplace(S, '&', '&amp;', [rfReplaceAll]);
  Result := StringReplace(Result, '<', '&lt;', [rfReplaceAll]);
  Result := StringReplace(Result, '>', '&gt;', [rfReplaceAll]);
  Result := StringReplace(Result, '"', '&quot;', [rfReplaceAll]);
  Result := StringReplace(Result, '''', '&apos;', [rfReplaceAll]);
end;

// Путь -> URI. Уже готовый URL возвращаем как есть.
function FileUri(const Path: string): string;
var
  Norm: string;
begin
  if Pos('://', Path) > 0 then
    Result := Path
  else
  begin
    Norm := StringReplace(Path, '\', '/', [rfReplaceAll]);
    Result := 'file:///' + Norm;
  end;
end;

// string -> HSTRING. Delphi сам не конвертирует — всегда через эту функцию.
function HStr(const Value: string): HSTRING;
begin
  if not Succeeded(WindowsCreateString(PWideChar(Value), Length(Value), Result)) then
    raise Exception.CreateFmt('Unable to create HString for "%s"', [Value]);
end;

// Активационная фабрика WinRT-класса по имени и IID интерфейса.
// ВАЖНО: фабрика должна РЕАЛИЗОВАТЬ этот интерфейс (как у ToastNotificationManager),
// иначе будет E_NOINTERFACE — как вышло с XmlDocument.
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

// Регистрируем имя и иконку приложения в реестре.
// Делается один раз при каждом запуске — быстрее, чем проверить наличие.
procedure RegisterAppIdentity(AppName: string);
var
  Reg: TRegistry;
begin
  Reg := TRegistry.Create(KEY_WRITE);
  try
    Reg.RootKey := HKEY_CURRENT_USER;
    if Reg.OpenKey('Software\Classes\AppUserModelId\' + FIXED_APP_ID, True) then
    try
      // DisplayName — имя в шапке тоаста и в настройках уведомлений
      Reg.WriteString('DisplayName', AppName);
      // IconUri — иконка приложения (полный путь, .png или .ico)
      Reg.WriteString('IconUri', ExtractFilePath(ParamStr(0)) + APP_ICON_PATH);
    finally
      Reg.CloseKey;
    end;
  finally
    Reg.Free;
  end;
end;

// ============================================================
//  ПАРСИНГ АРГУМЕНТОВ
//  toast.exe -t "Станция" -d "Трек" -i "icon.png" -p "station.jpg"
// ============================================================
procedure ParseArgs(out Station, Track, IconUrl, StationImgUrl, AppName: string);
var
  i: Integer;
  Args: TStringList;
begin
  Station := '';
  Track := '';
  IconUrl := '';
  StationImgUrl := '';
  Args := TStringList.Create;
  try
    for i := 1 to ParamCount do
      Args.Add(ParamStr(i));
    while Args.Count > 0 do
    begin
      if (Args.Count >= 2) and (Args[0] = '-t') then
      begin
        Station := Args[1];
        Args.Delete(0); Args.Delete(0);
      end
      else if (Args.Count >= 2) and (Args[0] = '-d') then
      begin
        Track := Args[1];
        Args.Delete(0); Args.Delete(0);
      end
      else if (Args.Count >= 2) and (Args[0] = '-i') then
      begin
        IconUrl := Args[1];
        Args.Delete(0); Args.Delete(0);
      end
      else if (Args.Count >= 2) and (Args[0] = '-p') then
      begin
        StationImgUrl := Args[1];
        Args.Delete(0); Args.Delete(0);
      end
      else if (Args.Count >= 2) and (Args[0] = '-a') then
      begin
        AppName := Args[1];
        Args.Delete(0); Args.Delete(0);
      end
      else
        Args.Delete(0); // неизвестный флаг — пропускаем
    end;
  finally
    Args.Free;
  end;
end;

// ============================================================
//  XML ТОАСТА
//  Атрибутов tag=/group= у <toast> в схеме НЕТ — Windows их игнорирует.
//  Перезапись делает IToastNotification2 через put_Tag/put_Group.
// ============================================================
function BuildToastXml(
  const StationName, TrackName, AppIconUri, StationImageUri: string
): string;
const
  CRLF = #13#10;
begin
  Result :=
    '<toast activationType="foreground">' + CRLF +
    '  <visual>' + CRLF +
    '    <binding template="ToastGeneric">' + CRLF +
    '      <text hint-style="title">%s</text>' + CRLF +                    // Станция
    '      <text>%s</text>' + CRLF +                                      // Трек
    '      <image placement="appLogoOverride" hint-crop="circle" src="%s"/>' + CRLF + // иконка слева
    '      <image src="%s"/>' + CRLF +                                    // картинка ВНИЗУ (inline, без placement!)
    '    </binding>' + CRLF +
    '  </visual>' + CRLF +
    '  <audio silent="true"/>' + CRLF +
    '</toast>';
  Result := Format(Result, [
    EscapeXml(StationName),
    EscapeXml(TrackName),
    EscapeXml(AppIconUri),
    EscapeXml(StationImageUri)
  ]);
end;

// ============================================================
//  ПОКАЗ ТОАСТА
// ============================================================
procedure ShowRadioToast(
  const AppID, StationName, TrackName, AppIconUri, StationImageUri, AppName: string
);
const
  SToastNotificationManager = 'Windows.UI.Notifications.ToastNotificationManager';
  // IID IToastNotificationManagerStatics — фабрика менеджера его реализует
  CLSID_ToastNotificationManager = '{50AC103F-D235-4598-BBEF-98FE4D1A3AD4}';
  SToastNotification = 'Windows.UI.Notifications.ToastNotification';
  // IID IToastNotificationFactory
  CLSID_ToastNotification = '{04124B20-82C6-4229-B109-FD9ED4662B53}';
var
  ToastManagerFactory, ToastFactory: IInspectable;
  ToastStatics: IToastNotificationManagerStatics;
  HistoryStatics: IToastNotificationManagerStatics2;
  History: IToastNotificationHistory;
  XmlDoc: Xml_Dom_IXmlDocument;
  ToastNotificationObj: IToastNotification;
  Toast2: IToastNotification2;
  ToastNotifierObj: IToastNotifier;
  XmlStr: string;
  hAppID, hTag, hGroup: HSTRING;
begin
  if TOSVersion.Major < 10 then
  begin
    Exit;
  end;
  RoInitialize(RO_INIT_MULTITHREADED);
  // 1. Ярлык с AppUserModelID — обязательное условие для win32-тоастов.
  // Устанавливается установщиком. Портабле версиии не доступны и правильно.
  // Пишем в реестр
  RegisterAppIdentity(AppName);
  // 2. Статический менеджер тоастов.
  ToastManagerFactory := GetFactory(SToastNotificationManager, CLSID_ToastNotificationManager);
  ToastStatics := IToastNotificationManagerStatics(ToastManagerFactory);
  // 3. Болванка документа из шаблона, затираем своим XML.
  XmlDoc := ToastStatics.GetTemplateContent(ToastTemplateType.ToastText01);
  XmlStr := BuildToastXml(StationName, TrackName, AppIconUri, StationImageUri);
  try
    (XmlDoc as Xml_Dom_IXmlDocumentIO).LoadXml(HStr(XmlStr));
  except
    on E: Exception do
    begin
      Exit;
    end;
  end;
  // 4. Объект ToastNotification из XML.
  ToastFactory := GetFactory(SToastNotification, CLSID_ToastNotification);
  ToastNotificationObj := IToastNotificationFactory(ToastFactory).CreateToastNotification(XmlDoc);
  // 5. Сразу ставим Tag и Group через IToastNotification2 —
  //    они нужны и для Hide, и для Remove, и для будущей замены.
  hAppID := HStr(AppID);
  hTag   := HStr(TOAST_TAG);
  hGroup := HStr(TOAST_GROUP);
  try
    Toast2 := ToastNotificationObj as IToastNotification2;
    Toast2.put_Tag(hTag);
    Toast2.put_Group(hGroup);
    // 6. Нотификатор для нашего AppID.
    ToastNotifierObj := ToastStatics.CreateToastNotifier(hAppID);
    // 7. ПРЯЧЕМ ПОПАП С ЭКРАНА.
    //    Замена по Tag/Group касается только Центра уведомлений:
    //    если старый попап ещё висит на экране, новый Show добавит ВТОРОЙ.
    //    Hide ищет по tag/group, а не по объекту, поэтому подойдёт
    //    наш новый тоаст с тем же тегом.
    try
      ToastNotifierObj.Hide(ToastNotificationObj);
    except
      // На экране ничего нет — это нормально, продолжаем.
    end;
    // 8. ЧИСТИМ ЦЕНТР УВЕДОМЛЕНИЙ от старых записей с этим tag/group
    //    (в том числе от запусков до того, как мы ставили теги).
    //    Трёхаргументная версия Remove — как раз для win32-приложения:
    //    последним параметром идёт наш AppUserModelID.
    try
      HistoryStatics := ToastManagerFactory as IToastNotificationManagerStatics2;
      History := HistoryStatics.History as IToastNotificationHistory;
      History.Remove(hTag, hGroup, hAppID);
      Sleep(300);
    except
      // Убирать нечего — не критично.
    end;
    // 9. ПОКАЗ нового тоаста.
    ToastNotifierObj.Show(ToastNotificationObj);
    Sleep(800);
  finally
    WindowsDeleteString(hAppID);
    WindowsDeleteString(hTag);
    WindowsDeleteString(hGroup);
  end;
end;

// ============================================================
//  MAIN
// ============================================================
var
  Station, Track, IconUrl, StationImgUrl, AppName: string;
begin
  try
    ParseArgs(Station, Track, IconUrl, StationImgUrl, AppName);
    if (Station = '') and (Track = '') then
    begin
      Exit;
    end;
    ShowRadioToast(
      FIXED_APP_ID,
      Station,
      Track,
      FileUri(IconUrl),
      FileUri(StationImgUrl),
      AppName
    );
  except
    on E: Exception do
      //
  end;
end.

