diff --git a/binding.gyp b/binding.gyp
index 3bf38cd..7063413 100644
--- a/binding.gyp
+++ b/binding.gyp
@@ -27,6 +27,10 @@
       ],
       'cflags_cc+': [
         "-Wno-deprecated-declarations"
+        '-std=c++20'
+      ],
+      'cflags_cc': [
+        '-std=c++20'
       ],
       'conditions': [
         # common exclusions
@@ -56,12 +60,22 @@
             ]
           }
         }],
+        ['OS=="win"', {
+          'msvs_settings': {
+            'VCCLCompilerTool': {
+              'AdditionalOptions': [
+                '/std:c++20',
+              ]
+            }
+          }
+        }],
         ['OS=="mac"', {
           'cflags':[
             "-stdlib=libc++"
           ],
           'xcode_settings': {
-            "OTHER_CPLUSPLUSFLAGS":["-std=c++14", "-stdlib=libc++"],
+            "OTHER_CPLUSPLUSFLAGS":["-std=c++20", "-stdlib=libc++"],
+            'CLANG_CXX_LANGUAGE_STANDARD':'c++20',
             "OTHER_LDFLAGS": ["-stdlib=libc++"],
             "MACOSX_DEPLOYMENT_TARGET": "10.7",
           },
