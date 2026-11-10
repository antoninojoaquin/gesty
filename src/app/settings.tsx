import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ChevronLeft, Info } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { getRate, setRate } from '@/db/settings';
import { getOpenShift } from '@/db/shifts';
import type { Db } from '@/db/types';
import { useFocusQuery } from '@/hooks/useFocusQuery';
import { appVersion } from '@/lib/appInfo';
import { showDialog, showError } from '@/lib/dialogs';
import { formatRateInput, parseRate } from '@/logic/money';
import { rateChangeNotice } from '@/logic/shifts';
import { colors, fonts, fontSize, radius, spacing, tabularNums, typography } from '@/theme';

async function loadSettings(db: Db) {
  const [rate, openShift] = await Promise.all([getRate(db), getOpenShift(db)]);
  return { rate, openShiftRate: openShift?.rate ?? null };
}

export default function Settings() {
  const db = useSQLiteContext();
  const { data, reload } = useFocusQuery(loadSettings);
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(false);

  // Show the stored rate once it loads (and after it changes).
  useEffect(() => {
    if (data) setInput(formatRateInput(String(data.rate)));
  }, [data?.rate]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const newRate = parseRate(input);
  const changed = data !== undefined && newRate !== null && newRate !== data.rate;

  async function onSaveRate() {
    if (!data || newRate === null) return;
    try {
      await setRate(db, newRate);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      // Rule 10: the open shift keeps the rate it started with.
      if (data.openShiftRate !== null && data.openShiftRate !== newRate) {
        await showDialog({
          title: 'Tarifa guardada',
          message: rateChangeNotice(data.openShiftRate),
          Icon: Info,
          actions: [{ label: 'Entendido', value: undefined, variant: 'outline' }],
          dismissValue: undefined,
        });
      }
      await reload();
    } catch (e) {
      showError('No se pudo guardar la tarifa', e);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton Icon={ChevronLeft} label="Volver" onPress={back} />
        <Text style={typography.title}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Tarifa por envío</Text>
          <View style={styles.rateInput}>
            <Text style={styles.currency}>$</Text>
            <TextInput
              value={input}
              onChangeText={(text) => {
                setInput(formatRateInput(text));
                setSaved(false);
              }}
              onSubmitEditing={onSaveRate}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={9}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              cursorColor={colors.accent}
              selectionColor={colors.accentSoft}
              style={styles.rateText}
              accessibilityLabel="Tarifa por envío, en pesos"
            />
          </View>
          <Text style={typography.bodyMuted}>
            Se aplica desde el próximo turno. Los turnos anteriores conservan la tarifa con la que se hicieron.
          </Text>
          <Button
            label={saved && !changed ? 'Tarifa guardada' : 'Guardar tarifa'}
            onPress={onSaveRate}
            disabled={!changed}
          />
        </Card>
      </ScrollView>

      <Text style={styles.footer}>Gesty · versión {appVersion()} · funciona sin internet</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  content: {
    gap: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  card: {
    gap: spacing.lg,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
  },
  rateInput: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  currency: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.number + 4,
    color: colors.placeholder,
  },
  rateText: {
    flex: 1,
    fontFamily: fonts.numberBold,
    fontSize: fontSize.number + 4,
    color: colors.text,
    paddingVertical: spacing.sm,
    ...tabularNums,
  },
  footer: {
    ...typography.label,
    textAlign: 'center',
    paddingTop: spacing.md,
  },
});
