export default {
  expo: {
    name: 'CalorieApp',
    slug: 'calorieapp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#2C2C54'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#2C2C54'
      },
      package: 'com.calorieapp.app'
    },
    web: {
      favicon: './assets/favicon.png'
    },
    plugins: [
      [
        'expo-font',
        {
          fonts: ['./assets/fonts']
        }
      ]
    ]
  }
};