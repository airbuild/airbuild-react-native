//
//  AirBuildModule.m
//  AirBuild React Native SDK
//
//  Minimal iOS native module for the AirBuild Distribution SDK.
//  Most update logic is handled in JS (Linking.openURL for install URLs).
//  This module provides a thin wrapper for opening URLs, kept for interface
//  parity with the Android native module.
//

#import "AirBuild.h"
#import <React/RCTLog.h>

@implementation AirBuild

RCT_EXPORT_MODULE(AirBuild);

/**
 * Opens a URL in the system browser (Safari).
 * The JS layer typically uses Linking.openURL directly, but this method
 * is provided for interface parity with the Android native module.
 */
RCT_EXPORT_METHOD(openUrl:(NSString *)url
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *nsUrl = [NSURL URLWithString:url];
  if (!nsUrl) {
    reject(@"AIRBUILD_INVALID_URL", @"Invalid URL", nil);
    return;
  }

  BOOL success = [[UIApplication sharedApplication] openURL:nsUrl];
  if (success) {
    resolve(nil);
  } else {
    reject(@"AIRBUILD_OPEN_URL_ERROR", @"Failed to open URL", nil);
  }
}

/**
 * downloadAndInstallApk is a no-op on iOS.
 * iOS cannot sideload IPA files, so the JS layer opens the install URL
 * in Safari via Linking.openURL instead. This method exists only for
 * interface parity and will reject if called.
 */
RCT_EXPORT_METHOD(downloadAndInstallApk:(NSString *)downloadUrl
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  reject(@"AIRBUILD_NOT_SUPPORTED",
         @"APK install is not supported on iOS. Use openUrl or Linking.openURL instead.",
         nil);
}

@end
