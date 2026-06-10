import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type BlockingStateProps = {
  colors: any;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
};

export function BlockingState({
  colors,
  icon,
  iconColor,
  title,
  message,
  primaryLabel,
  secondaryLabel = 'GERİ DÖN',
  onPrimaryPress,
  onSecondaryPress,
}: BlockingStateProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: `${iconColor}1A`, alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
        <Ionicons name={icon} size={48} color={iconColor} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 16, textAlign: 'center', textTransform: 'uppercase', fontStyle: 'italic' }}>
        {title}
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 40, lineHeight: 22, fontWeight: '500' }}>
        {message}
      </Text>
      <Pressable
        style={({ pressed }) => [{ width: '100%', height: 60, backgroundColor: colors.tint, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, marginBottom: 16, opacity: pressed ? 0.8 : 1 }]}
        onPress={onPrimaryPress}
      >
        <Ionicons name="flash" size={24} color="#FFF" />
        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 }}>{primaryLabel}</Text>
      </Pressable>
      {onSecondaryPress && (
        <Pressable
          style={({ pressed }) => [{ width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 }]}
          onPress={onSecondaryPress}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '800', letterSpacing: 1 }}>{secondaryLabel}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

export function ScreenLoader({ colors }: { colors: any }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.tint} />
    </View>
  );
}
