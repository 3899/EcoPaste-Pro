!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "Software\Classes\*\shell\EcoPaste" "MUIVerb" "EcoPaste"
  WriteRegStr SHCTX "Software\Classes\*\shell\EcoPaste" "Icon" "$INSTDIR\EcoPaste.exe"
  WriteRegStr SHCTX "Software\Classes\*\shell\EcoPaste" "SubCommands" ""
  WriteRegStr SHCTX "Software\Classes\*\shell\EcoPaste\shell\copy_file_content" "MUIVerb" "复制文件内容到剪贴板"
  WriteRegStr SHCTX "Software\Classes\*\shell\EcoPaste\shell\copy_file_content" "Icon" "$INSTDIR\EcoPaste.exe"
  WriteRegStr SHCTX "Software\Classes\*\shell\EcoPaste\shell\copy_file_content\command" "" '"$INSTDIR\EcoPaste.exe" --copy-file-content "%1"'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DeleteRegKey SHCTX "Software\Classes\*\shell\EcoPaste"
!macroend
