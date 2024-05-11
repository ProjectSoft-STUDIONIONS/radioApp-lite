echo off
set arg1=%1
pushd %arg1%
copy /b nw.exe+package.nw YourRadio.exe

call :sleep 2

del /s /q nw.exe
del /s /q package.nw

goto :EOF

:: echo off
:: 
:: del /s /q nw.exe
:: del /s /q package.nw

:sleep
    set /a ftime=100%time:~6,-3%%%100+%1
    if %ftime% GEQ 60 set /a ftime-=60
    :loop
    set ctime=%time:~6,-3%
    if /i %ftime% NEQ %ctime% goto :loop
exit /b 0