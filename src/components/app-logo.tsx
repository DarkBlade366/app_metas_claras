import { Image } from 'expo-image';

export function AppLogo({ size = 46, radius = 12 }: { size?: number; radius?: number }) {
  return (
    <Image
      source={require('@/assets/images/logo.png')}
      style={{ width: size, height: size, borderRadius: radius }}
      contentFit="cover"
    />
  );
}