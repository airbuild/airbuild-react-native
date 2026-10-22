//
//  AirBuild.h
//  AirBuild React Native SDK
//
//  Minimal iOS native module for the AirBuild Distribution SDK.
//  Most update logic is handled in JS (Linking.openURL for install URLs).
//  This module provides a thin wrapper for opening URLs, kept for interface
//  parity with the Android native module.
//

#import <React/RCTBridgeModule.h>

@interface AirBuild : NSObject <RCTBridgeModule>

@end
