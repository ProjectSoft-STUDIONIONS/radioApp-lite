// toast.cpp — C++Builder (RAD Studio 23.0), Win32, БЕЗ Delphi-RTL
// GUI-подсистема (c0w32): консольного окна нет.
// WinRT — через самодельные ABI-объявления и динамически загруженный
// combase.dll. Внешние зависимости: только import32.lib.

#include <windows.h>
#include <string.h>   // wcslen, wcscpy, wcscat, wcscmp, wcscpy_s


// Лог прогресса: пишем шаги в файл рядом с exe
static void LogMsg(const wchar_t* msg)
{
    /*
    wchar_t path[MAX_PATH];
    GetModuleFileNameW(NULL, path, MAX_PATH);
    wchar_t* slash = wcsrchr(path, L'\\');
    if (slash) *(slash + 1) = 0;
    wcscat(path, L"toast_log.txt");

    HANDLE f = CreateFileW(path, FILE_APPEND_DATA, FILE_SHARE_READ, NULL,
                           OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    if (f == INVALID_HANDLE_VALUE) return;
    SYSTEMTIME st; GetLocalTime(&st);
    wchar_t line[512];
    wsprintfW(line, L"[%02d:%02d:%02d.%03d] %s\r\n",
              st.wHour, st.wMinute, st.wSecond, st.wMilliseconds, msg);
    DWORD w;
    WriteFile(f, line, (DWORD)(wcslen(line) * sizeof(wchar_t)), &w, NULL);
    CloseHandle(f);
    */
}

// Добавлено
static void LogHR(const wchar_t* what, HRESULT hr)
{
    wchar_t buf[256];
    wsprintfW(buf, L"%s hr=0x%08X", what, (unsigned)hr);
    LogMsg(buf);
}

// ============================================================
//  КОНСТАНТЫ
// ============================================================
static const wchar_t* FIXED_APP_ID  = L"YourRadio.DesktopNotification.Sample";
static const wchar_t* TOAST_TAG     = L"current-track";
static const wchar_t* TOAST_GROUP   = L"radio-app";
static const wchar_t* APP_ICON_NAME = L"favicon.png";

// IID фабрик и интерфейсов — подтверждены в Delphi-версии и по SDK
static const GUID IID_ToastManagerStatics = {
    0x50AC103F, 0xD235, 0x4598, {0xBB, 0xEF, 0x98, 0xFE, 0x4D, 0x1A, 0x3A, 0xD4}};
static const GUID IID_ToastNotifFactory = {
    0x04124B20, 0x82C6, 0x4229, {0xB1, 0x09, 0xFD, 0x9E, 0xD4, 0x66, 0x2B, 0x53}};
static const GUID IID_ToastNotification2 = {
    0x9DFB9FD1, 0x143A, 0x490E, {0x90, 0xBF, 0xB9, 0xFB, 0xA7, 0x13, 0x2D, 0xE7}};
static const GUID IID_XmlDocumentIO = {
    0x6CD0E74E, 0xEE65, 0x4489, {0x9E, 0xBF, 0xCA, 0x43, 0xE8, 0x7B, 0xA6, 0x37}};

// Добавлено
static const GUID IID_IActivationFactory = {
    0x00000035, 0x0000, 0x0000, {0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46}};


// ============================================================
//  МАЛЫЙ ABI-УРОВЕНЬ
// ============================================================
#ifndef _HSTRING_DEFINED
#define _HSTRING_DEFINED
struct HSTRING__;
typedef HSTRING__* HSTRING;
#endif

// База WinRT: три метода IUnknown + GetIids/GetRuntimeClassName/GetTrustLevel
struct IInspectable : public IUnknown
{
    virtual HRESULT STDMETHODCALLTYPE GetIids(unsigned long* iidCount, GUID** iids) = 0;
    virtual HRESULT STDMETHODCALLTYPE GetRuntimeClassName(HSTRING* className) = 0;
    virtual HRESULT STDMETHODCALLTYPE GetTrustLevel(int* trustLevel) = 0;
};

struct IXmlDocument : public IInspectable {};

struct IActivationFactory : public IInspectable
{
    virtual HRESULT STDMETHODCALLTYPE ActivateInstance(IInspectable** instance) = 0;
};

// LoadXml — первый метод IXmlDocumentIO
struct IXmlDocumentIO : public IInspectable
{
    virtual HRESULT STDMETHODCALLTYPE LoadXml(HSTRING xml) = 0;
};

// В ABI нумерация шаблонов начинается с ToastImageAndText01, поэтому
// текстовый ToastText01 — четвёртый, а не нулевой.
enum ToastTemplateType { ToastText01 = 4 };

struct IToastNotification : public IInspectable {};

// get-заглушки перед put_* — чтобы слоты vtable совпали с ABI
struct IToastNotification2 : public IInspectable
{
    virtual HRESULT STDMETHODCALLTYPE put_Tag(HSTRING value) = 0;
    virtual HRESULT STDMETHODCALLTYPE get_Tag(HSTRING* value) = 0;
    virtual HRESULT STDMETHODCALLTYPE put_Group(HSTRING value) = 0;
    virtual HRESULT STDMETHODCALLTYPE get_Group(HSTRING* value) = 0;
    virtual HRESULT STDMETHODCALLTYPE put_SuppressPopup(unsigned char value) = 0;
    virtual HRESULT STDMETHODCALLTYPE get_SuppressPopup(unsigned char* value) = 0;
};

struct IToastNotifier : public IInspectable
{
    virtual HRESULT STDMETHODCALLTYPE Show(IToastNotification* toast) = 0;
    virtual HRESULT STDMETHODCALLTYPE Hide(IToastNotification* toast) = 0;
    virtual HRESULT STDMETHODCALLTYPE get_Setting(int* value) = 0; // свойство — последним
};

struct IToastNotificationFactory : public IInspectable
{
    virtual HRESULT STDMETHODCALLTYPE CreateToastNotification(IXmlDocument* content,
                                                              IToastNotification** result) = 0;
};

struct IToastNotificationManagerStatics : public IInspectable
{
    virtual HRESULT STDMETHODCALLTYPE GetTemplateContent(ToastTemplateType templateType,
                                                         IXmlDocument** value) = 0;
    virtual HRESULT STDMETHODCALLTYPE CreateToastNotifier(HSTRING applicationId,
                                                          IToastNotifier** value) = 0;
};

// ============================================================
//  ДИНАМИЧЕСКАЯ ЗАГРУЗКА combase.dll
// ============================================================
typedef HRESULT (WINAPI *PFN_RoInitialize)(int);
typedef HRESULT (WINAPI *PFN_RoGetActivationFactory)(HSTRING, const GUID&, void**);
typedef HRESULT (WINAPI *PFN_WindowsCreateString)(const wchar_t*, UINT32, HSTRING*);
typedef HRESULT (WINAPI *PFN_WindowsDeleteString)(HSTRING);

static PFN_RoInitialize           pRoInitialize;
static PFN_RoGetActivationFactory pRoGetActivationFactory;
static PFN_WindowsCreateString    pWindowsCreateString;
static PFN_WindowsDeleteString    pWindowsDeleteString;

static bool LoadWinRtApi()
{
    static bool Loaded = false;
    if (Loaded) return true;

    HMODULE combase = LoadLibraryW(L"combase.dll");
    if (!combase) return false;

    pRoInitialize           = (PFN_RoInitialize)GetProcAddress(combase, "RoInitialize");
    pRoGetActivationFactory = (PFN_RoGetActivationFactory)GetProcAddress(combase, "RoGetActivationFactory");
    pWindowsCreateString    = (PFN_WindowsCreateString)GetProcAddress(combase, "WindowsCreateString");
    pWindowsDeleteString    = (PFN_WindowsDeleteString)GetProcAddress(combase, "WindowsDeleteString");

    Loaded = pRoInitialize && pRoGetActivationFactory &&
             pWindowsCreateString && pWindowsDeleteString;
    return Loaded;
}

// ============================================================
//  СТРОКИ И ПАМЯТЬ (без RTL — на wchar_t)
// ============================================================

// string -> HSTRING
static HSTRING HStr(const wchar_t* Value)
{
    HSTRING H = nullptr;
    if (FAILED(pWindowsCreateString(Value, (UINT32)wcslen(Value), &H)))
        return nullptr;
    return H;
}

struct HStrGuard
{
    HSTRING H;
    HStrGuard(HSTRING Value) : H(Value) {}
    ~HStrGuard() { if (H) pWindowsDeleteString(H); }
};

template <typename T>
struct ComPtr
{
    T* Ptr;
    ComPtr() : Ptr(nullptr) {}
    ~ComPtr() { if (Ptr) Ptr->Release(); }
    T** operator&() { return &Ptr; }
    T*  operator->() const { return Ptr; }
    T*  Get() const { return Ptr; }
private:
    ComPtr(const ComPtr&);
    ComPtr& operator=(const ComPtr&);
};

// Аппенд с проверкой ёмкости: не может переполнить буфер
static void Cat(wchar_t* dst, size_t cap, const wchar_t* part)
{
    size_t dl = wcslen(dst);
    size_t sl = wcslen(part);
    if (dl + sl < cap)
    {
        wcscpy(dst + dl, part);
    }
    else if (dl < cap) // обрезаем, чтобы не потерять завершающий ноль
    {
        size_t room = cap - dl - 1;
        wcsncpy(dst + dl, part, room);
        dst[cap - 1] = 0;
    }
}

// Экранирование спецсимволов XML
static void EscapeXml(const wchar_t* in, wchar_t* out, size_t cap)
{
    size_t o = 0;
    out[0] = 0;
    for (const wchar_t* p = in; *p; ++p)
    {
        const wchar_t* rep = NULL;
        switch (*p)
        {
            case L'&':  rep = L"&amp;";   break;
            case L'<':  rep = L"&lt;";    break;
            case L'>':  rep = L"&gt;";    break;
            case L'"':  rep = L"&quot;";  break;
            case L'\'': rep = L"&apos;";  break;
        }
        const wchar_t* src = rep ? rep : p;
        size_t sl = rep ? wcslen(rep) : 1;
        if (o + sl + 1 >= cap)
            break; // обрезаем на границе, чтобы не сломать XML посреди сущности
        wcsncpy(out + o, src, sl);
        o += sl;
    }
    out[o] = 0;
}

// Путь -> URI. Уже готовый URL возвращаем как есть.
static void FileUri(const wchar_t* in, wchar_t* out, size_t cap)
{
    if (wcsstr(in, L"://"))
    {
        wcsncpy(out, in, cap - 1);
        out[cap - 1] = 0;
        return;
    }
    Cat(out, cap, L"file:///");
    for (const wchar_t* p = in; *p; ++p)
    {
        wchar_t buf[2] = { *p == L'\\' ? L'/' : *p, 0 };
        Cat(out, cap, buf);
    }
}

// ============================================================
//  РЕЕСТР: DisplayName и IconUri (ярлык с AUMID делает InnoSetup)
// ============================================================
static void RegisterAppIdentity(const wchar_t* AppName)
{
    wchar_t path[MAX_PATH];
    GetModuleFileNameW(NULL, path, MAX_PATH);
    wchar_t* slash = wcsrchr(path, L'\\');
    if (slash) *(slash + 1) = 0;

    wchar_t icon[MAX_PATH + 32];
    wcscpy(icon, path);
    wcscat(icon, APP_ICON_NAME);

    wchar_t key[256];
    wsprintfW(key, L"Software\\Classes\\AppUserModelId\\%s", FIXED_APP_ID);

    HKEY h;
    if (RegCreateKeyExW(HKEY_CURRENT_USER, key, 0, NULL,
                        REG_OPTION_NON_VOLATILE, KEY_WRITE, NULL, &h, NULL) == ERROR_SUCCESS)
    {
        RegSetValueExW(h, L"DisplayName", 0, REG_SZ,
                       (const BYTE*)AppName, (DWORD)((wcslen(AppName) + 1) * sizeof(wchar_t)));
        RegSetValueExW(h, L"IconUri", 0, REG_SZ,
                       (const BYTE*)icon, (DWORD)((wcslen(icon) + 1) * sizeof(wchar_t)));
        RegCloseKey(h);
    }
}

// ============================================================
//  XML ТОАСТА
// ============================================================
static void BuildToastXml(const wchar_t* StationName, const wchar_t* TrackName,
                          const wchar_t* AppIconUri, const wchar_t* StationImageUri,
                          wchar_t* xml, size_t cap)
{
    wchar_t e1[2048], e2[2048], e3[2048], e4[2048];
    EscapeXml(StationName,     e1, 2048);
    EscapeXml(TrackName,       e2, 2048);
    EscapeXml(AppIconUri,      e3, 2048);
    EscapeXml(StationImageUri, e4, 2048);

    xml[0] = 0;
    Cat(xml, cap, L"<toast activationType=\"foreground\">");
    Cat(xml, cap, L"<visual>");
    Cat(xml, cap, L"<binding template=\"ToastGeneric\">");
    Cat(xml, cap, L"<text hint-style=\"title\">");
    Cat(xml, cap, e1);
    Cat(xml, cap, L"</text>");
    Cat(xml, cap, L"<text>");
    Cat(xml, cap, e2);
    Cat(xml, cap, L"</text>");
    Cat(xml, cap, L"<image placement=\"appLogoOverride\" hint-crop=\"circle\" src=\"");
    Cat(xml, cap, e3);
    Cat(xml, cap, L"\"/>");
    Cat(xml, cap, L"<image src=\"");
    Cat(xml, cap, e4);
    Cat(xml, cap, L"\"/>");
    Cat(xml, cap, L"</binding>");
    Cat(xml, cap, L"</visual>");
    Cat(xml, cap, L"<audio silent=\"true\"/>");
    Cat(xml, cap, L"</toast>");
}

// ============================================================
//  ПОКАЗ ТОАСТА
// ============================================================
static void ShowRadioToast(const wchar_t* AppID, const wchar_t* StationName,
                           const wchar_t* TrackName, const wchar_t* AppIconUri,
                           const wchar_t* StationImageUri, const wchar_t* AppName)
{
    LogMsg(L"start");
    if (!LoadWinRtApi()) { LogMsg(L"FAIL: combase load"); return; }
    LogMsg(L"combase loaded");

    pRoInitialize(1); // RO_INIT_MULTITHREADED
    LogMsg(L"RoInitialize done");

    RegisterAppIdentity(AppName);
    LogMsg(L"registry done");

    // 1. Фабрика менеджера
    ComPtr<IToastNotificationManagerStatics> Mgr;
    {
        HStrGuard HName(HStr(L"Windows.UI.Notifications.ToastNotificationManager"));
        if (!HName.H) { LogMsg(L"FAIL: HString manager name"); return; }
        void* P = nullptr;
        if (FAILED(pRoGetActivationFactory(HName.H, IID_ToastManagerStatics, &P)))
            { LogMsg(L"FAIL: manager factory"); return; }
        Mgr.Ptr = (IToastNotificationManagerStatics*)P;
    }
    LogMsg(L"manager factory ok");

    // 2. XmlDocument создаём напрямую через IActivationFactory,
    //    вместо GetTemplateContent (он ронял процесс)
    ComPtr<IXmlDocument> XmlDoc;
    {
        HStrGuard HName(HStr(L"Windows.Data.Xml.Dom.XmlDocument"));
        if (!HName.H) { LogMsg(L"FAIL: HString xmldom name"); return; }
        void* P = nullptr;
        HRESULT hr = pRoGetActivationFactory(HName.H, IID_IActivationFactory, &P);
        if (FAILED(hr) || !P) { LogHR(L"FAIL: xmldom factory", hr); return; }
        ComPtr<IActivationFactory> Af;
        Af.Ptr = (IActivationFactory*)P;

        IInspectable* inst = nullptr;
        hr = Af->ActivateInstance(&inst);
        if (FAILED(hr) || !inst) { LogHR(L"FAIL: ActivateInstance", hr); return; }
        // ActivateInstance вернул владеемую ссылку — ComPtr заберёт её себе
        XmlDoc.Ptr = (IXmlDocument*)inst;
    }
    LogMsg(L"xml document created");

    ComPtr<IXmlDocumentIO> XmlIO;
    if (FAILED(XmlDoc->QueryInterface(IID_XmlDocumentIO, (void**)&XmlIO)))
        { LogMsg(L"FAIL: QI XmlDocumentIO"); return; }

    wchar_t xml[16384];
    BuildToastXml(StationName, TrackName, AppIconUri, StationImageUri, xml, 16384);
    {
        HStrGuard HXml(HStr(xml));
        if (!HXml.H) { LogMsg(L"FAIL: HString xml"); return; }
        if (FAILED(XmlIO->LoadXml(HXml.H)))
            { LogMsg(L"FAIL: LoadXml"); return; }
    }
    LogMsg(L"LoadXml ok");

    // 3. ToastNotification из XML
    ComPtr<IToastNotificationFactory> Nf;
    {
        HStrGuard HName(HStr(L"Windows.UI.Notifications.ToastNotification"));
        if (!HName.H) { LogMsg(L"FAIL: HString notif name"); return; }
        void* P = nullptr;
        if (FAILED(pRoGetActivationFactory(HName.H, IID_ToastNotifFactory, &P)))
            { LogMsg(L"FAIL: notif factory"); return; }
        Nf.Ptr = (IToastNotificationFactory*)P;
    }

    ComPtr<IToastNotification> Toast;
    if (FAILED(Nf->CreateToastNotification(XmlDoc.Get(), &Toast)))
        { LogMsg(L"FAIL: CreateToastNotification"); return; }
    LogMsg(L"toast created");

    // 4. Tag и Group (перезапись и Hide живут на них)
    HStrGuard HAppID(HStr(AppID));
    HStrGuard HTag(HStr(TOAST_TAG));
    HStrGuard HGroup(HStr(TOAST_GROUP));
    if (!HAppID.H || !HTag.H || !HGroup.H)
        { LogMsg(L"FAIL: HString tag/group"); return; }

    {
        ComPtr<IToastNotification2> T2;
        if (SUCCEEDED(Toast->QueryInterface(IID_ToastNotification2, (void**)&T2)))
        {
            T2->put_Tag(HTag.H);
            T2->put_Group(HGroup.H);
            LogMsg(L"tag/group set");
        }
        else
        {
            LogMsg(L"QI IToastNotification2 failed (не критично)");
        }
    }

    // 5. Нотификатор для нашего AppID
    ComPtr<IToastNotifier> Notifier;
    if (FAILED(Mgr->CreateToastNotifier(HAppID.H, &Notifier)))
        { LogMsg(L"FAIL: CreateToastNotifier"); return; }
    LogMsg(L"notifier ok");

    // 6-7. Hide убирает старый тост из Центра, Show показывает новый
    HRESULT hr = Notifier->Hide(Toast.Get());
    LogHR(L"hide", hr);

    hr = Notifier->Show(Toast.Get());
    LogHR(L"show", hr);
    Sleep(800);
    LogMsg(L"done");
}

// ============================================================
//  ПРОВЕРКА ВЕРСИИ ОС (RtlGetVersion — GetVersionEx лжёт с манифестом)
// ============================================================
typedef LONG (WINAPI *PFN_RtlGetVersion)(OSVERSIONINFOEXW*);

static bool IsWin10OrNewer()
{
    HMODULE ntdll = GetModuleHandleW(L"ntdll.dll");
    if (!ntdll) return true; // не проверили — показываем как раньше
    PFN_RtlGetVersion f = (PFN_RtlGetVersion)GetProcAddress(ntdll, "RtlGetVersion");
    if (!f) return true;
    OSVERSIONINFOEXW os;
    memset(&os, 0, sizeof(os));
    os.dwOSVersionInfoSize = sizeof(os);
    if (f(&os) != 0) return true;
    return os.dwMajorVersion >= 10;
}

static LONG WINAPI CrashLog(PEXCEPTION_POINTERS ep)
{
    // логируем только настоящие AV, чтобы не спамить штатными внутренними исключениями WinRT
    if (ep->ExceptionRecord->ExceptionCode == 0xC0000005)
    {
        wchar_t buf[256];
        wsprintfW(buf, L"CRASH 0x%08X at 0x%p",
                  (unsigned)ep->ExceptionRecord->ExceptionCode,
                  ep->ExceptionRecord->ExceptionAddress);
        LogMsg(buf);
    }
    return EXCEPTION_CONTINUE_SEARCH;
}
// ============================================================
//  MAIN (GUI-подсистема: окна консоли нет)
// ============================================================
int WINAPI WinMain(HINSTANCE, HINSTANCE, LPSTR, int)
{
    AddVectoredExceptionHandler(1, CrashLog);
    if (!IsWin10OrNewer())
        return 0;

    int argc = 0;
    LPWSTR* argv = CommandLineToArgvW(GetCommandLineW(), &argc);
    if (!argv)
        return 0;

    const wchar_t* station       = NULL;
    const wchar_t* track         = NULL;
    const wchar_t* iconUrl       = L"";
    const wchar_t* stationImgUrl = L"";
    const wchar_t* appName       = L"";

    for (int i = 1; i < argc; i++)
    {
        // флаг — ровно один символ после минуса
        if (argv[i][0] == L'-' && argv[i][1] != 0 && argv[i][2] == 0 && i + 1 < argc)
        {
            switch (argv[i][1])
            {
                case L't': station       = argv[i + 1]; break;
                case L'd': track         = argv[i + 1]; break;
                case L'i': iconUrl       = argv[i + 1]; break;
                case L'p': stationImgUrl = argv[i + 1]; break;
                case L'a': appName       = argv[i + 1]; break;
                default: i--; break; // неизвестный флаг — пропускаем только его
            }
            i++;
        }
    }

    if ((station == NULL || station[0] == 0) && (track == NULL || track[0] == 0))
    {
        LocalFree(argv);
        return 0;
    }

    if (appName[0] == 0)
        appName = L"YourRadio";

    wchar_t u1[2048], u2[2048];
    u1[0] = 0; u2[0] = 0;
    FileUri(iconUrl,       u1, 2048);
    FileUri(stationImgUrl, u2, 2048);

    ShowRadioToast(FIXED_APP_ID, station ? station : L"",
                   track ? track : L"", u1, u2, appName);

    LocalFree(argv);
    return 0;
}

