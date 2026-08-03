{
  "targets": [
    {
      "target_name": "audio_session",
      "sources": [
        "src/audio_session.cc"
      ],
      "include_dirs": [
        "<(node_root_dir)/include/node",
        "$(WindowsSdkDir)Include"
      ],
      "libraries": [
        "mmdevapi.lib",
        "ole32.lib",
        "uuid.lib"
      ],
      "msvs_settings": {
        "VCLinkerTool": {
          "AdditionalDependencies": [
            "mmdevapi.lib",
            "ole32.lib",
            "uuid.lib"
          ],
          "GenerateDebugInformation": "true"
        }
      }
    }
  ]
}