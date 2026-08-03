#include <node_api.h>
#include <windows.h>
#include <mmdeviceapi.h>
#include <audiopolicy.h>
#include <string>
#include <vector>
#include <memory>

struct ComDeleter {
	template<typename T>
	void operator()(T* p) const {
		if (p) p->Release();
	}
};

template<typename T>
using ComPtr = std::unique_ptr<T, ComDeleter>;

static napi_value SetDisplayName(napi_env env, napi_callback_info info) {
	size_t argc = 0;
	napi_status status;

	// Шаг 1: узнаём количество аргументов (4-й аргумент = nullptr, чтобы не было ошибки типов)
	status = napi_get_cb_info(env, info, &argc, nullptr, nullptr, nullptr);
	if (status != napi_ok) {
		napi_throw_error(env, nullptr, "Failed to get callback info");
		return nullptr;
	}

	if (argc == 0) {
		napi_throw_error(env, nullptr, "Expected at least one argument (display name)");
		return nullptr;
	}

	// Шаг 2: достаём первый аргумент отдельно
	napi_value arg0 = nullptr;
	// Здесь 4-й аргумент — это napi_value*, и мы передаём адрес arg0 (napi_value*)
	status = napi_get_cb_info(env, info, nullptr, &arg0, nullptr, nullptr);
	if (status != napi_ok || arg0 == nullptr) {
		napi_throw_error(env, nullptr, "Failed to get first argument");
		return nullptr;
	}

	// Получаем строку: буфер + длина из записанного
	const size_t MAX_LEN = 1024;
	std::vector<char> buf(MAX_LEN);
	size_t written = 0;

	status = napi_get_value_string_utf8(env, arg0, buf.data(), buf.size(), &written);
	if (status != napi_ok || written == 0) {
		napi_throw_error(env, nullptr, "Invalid string argument");
		return nullptr;
	}
	buf[written] = '\0';

	// Конвертируем UTF‑8 в wchar_t
	int wideLen = MultiByteToWideChar(CP_UTF8, 0, buf.data(), static_cast<int>(written), nullptr, 0);
	if (wideLen <= 0) {
		napi_throw_error(env, nullptr, "MultiByteToWideChar failed");
		return nullptr;
	}

	std::wstring wstr(wideLen, L'\0');
	MultiByteToWideChar(CP_UTF8, 0, buf.data(), static_cast<int>(written),
						const_cast<wchar_t*>(wstr.data()), wideLen);

	HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
	bool need_uninit = SUCCEEDED(hr);

	IMMDeviceEnumerator* pEnumeratorRaw = nullptr;
	hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_INPROC_SERVER,
						  __uuidof(IMMDeviceEnumerator), reinterpret_cast<void**>(&pEnumeratorRaw));
	if (FAILED(hr) || !pEnumeratorRaw) {
		if (need_uninit) CoUninitialize();
		napi_throw_error(env, nullptr, "CoCreateInstance failed for MMDeviceEnumerator");
		return nullptr;
	}
	ComPtr<IMMDeviceEnumerator> pEnumerator(pEnumeratorRaw, ComDeleter());

	IMMDevice* pDeviceRaw = nullptr;
	hr = pEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &pDeviceRaw);
	if (FAILED(hr) || !pDeviceRaw) {
		if (need_uninit) CoUninitialize();
		napi_throw_error(env, nullptr, "GetDefaultAudioEndpoint failed");
		return nullptr;
	}
	ComPtr<IMMDevice> pDevice(pDeviceRaw, ComDeleter());

	IAudioSessionManager2* pSessionManagerRaw = nullptr;
	hr = pDevice->Activate(__uuidof(IAudioSessionManager2), CLSCTX_ALL, nullptr,
						   reinterpret_cast<void**>(&pSessionManagerRaw));
	if (FAILED(hr) || !pSessionManagerRaw) {
		if (need_uninit) CoUninitialize();
		napi_throw_error(env, nullptr, "Activate IAudioSessionManager2 failed");
		return nullptr;
	}
	ComPtr<IAudioSessionManager2> pSessionManager(pSessionManagerRaw, ComDeleter());

	IAudioSessionEnumerator* pSessionEnumeratorRaw = nullptr;
	hr = pSessionManager->GetSessionEnumerator(&pSessionEnumeratorRaw);
	if (FAILED(hr) || !pSessionEnumeratorRaw) {
		if (need_uninit) CoUninitialize();
		napi_throw_error(env, nullptr, "GetSessionEnumerator failed");
		return nullptr;
	}
	ComPtr<IAudioSessionEnumerator> pSessionEnumerator(pSessionEnumeratorRaw, ComDeleter());

	// Сначала читаем в int — так компилятор точно не ругается
	int countInt = 0;
	hr = pSessionEnumerator->GetCount(&countInt);
	if (FAILED(hr)) {
		if (need_uninit) CoUninitialize();
		napi_throw_error(env, nullptr, "GetCount failed");
		return nullptr;
	}

	// Теперь безопасно конвертируем в LONG (на 32‑битной системе это просто присваивание)
	LONG count = static_cast<LONG>(countInt);

	DWORD currentPid = GetCurrentProcessId();
	bool found = false;

	for (LONG i = 0; i < count; ++i) {
		IAudioSessionControl* pSessionControlRaw = nullptr;
		if (FAILED(pSessionEnumerator->GetSession(i, &pSessionControlRaw))) continue;
		ComPtr<IAudioSessionControl> pSessionControl(pSessionControlRaw, ComDeleter());

		IAudioSessionControl2* pSessionControl2Raw = nullptr;
		HRESULT qi = pSessionControl->QueryInterface(__uuidof(IAudioSessionControl2),
													 reinterpret_cast<void**>(&pSessionControl2Raw));
		if (FAILED(qi) || !pSessionControl2Raw) continue;
		ComPtr<IAudioSessionControl2> pSessionControl2(pSessionControl2Raw, ComDeleter());

		DWORD pid = 0;
		pSessionControl2->GetProcessId(&pid);

		if (pid == currentPid) {
			pSessionControl2->SetDisplayName(wstr.c_str(), nullptr);
			found = true;
			break;
		}
	}

	if (need_uninit) CoUninitialize();

	napi_value result;
	if (found) {
		status = napi_get_boolean(env, true, &result);
	} else {
		status = napi_get_boolean(env, false, &result);
	}
	if (status != napi_ok) {
		return nullptr;
	}
	return result;
}

napi_value Init(napi_env env, napi_value exports) {
	napi_value fn;
	napi_create_function(env, nullptr, 0, SetDisplayName, nullptr, &fn);
	napi_set_named_property(env, exports, "setDisplayName", fn);
	return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
