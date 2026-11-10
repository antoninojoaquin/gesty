import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { spacing, typography } from '@/theme';

/** Temporary screen for routes not built yet. Removed once every screen exists. */
export function Placeholder({ title }: { title: string }) {
  return (
    <Screen>
      <View style={styles.header}>
        <IconButton Icon={ChevronLeft} label="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text style={typography.title}>{title}</Text>
      </View>
      <Text style={[typography.bodyMuted, styles.body]}>Pantalla en construcción.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  body: { marginTop: spacing.xxl },
});
