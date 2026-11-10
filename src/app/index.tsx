import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Database, History, Play, Settings } from '@/components/icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { importData } from '@/db/backup';
import { getRate } from '@/db/settings';
import { getLastClosedShift, getOpenShift, startShift } from '@/db/shifts';
import type { Db } from '@/db/types';
import { buildDemoData } from '@/dev/demoData';
import { useFocusQuery } from '@/hooks/useFocusQuery';
import { confirm, showError } from '@/lib/dialogs';
import { formatLongDate, formatShortDate, formatTimeRange } from '@/logic/dates';
import { formatMoney } from '@/logic/money';
import { shiftTotal } from '@/logic/shifts';
import { bandOpacity, colors, fonts, fontSize, sizes, spacing, tabularNums, typography } from '@/theme';

const RING = sizes.startButton + 20;
const BAND_THICKNESS = 120;
const BAND_ANGLE = '-32deg';

/** DEVELOPMENT ONLY: replaces all data with the sample data shaped like docs/diseno/. */
async function loadDemoData(db: Db, onDone: () => void) {
  const ok = await confirm(
    'Datos de ejemplo',
    'Reemplaza todos los datos por datos de ejemplo. Solo en desarrollo.',
    'Cargar',
    { destructive: true, Icon: Database },
  );
  if (!ok) return;
  await importData(db, buildDemoData(Date.now()));
  onDone();
}

async function loadHome(db: Db) {
  const [open, last, rate] = await Promise.all([getOpenShift(db), getLastClosedShift(db), getRate(db)]);
  return { hasOpenShift: open !== null, last, rate };
}

export default function Home() {
  const db = useSQLiteContext();
  const { data, reload } = useFocusQuery(loadHome);
  const [starting, setStarting] = useState(false);

  // With a shift in progress, the main screen is the active shift.
  useEffect(() => {
    if (data?.hasOpenShift) router.replace('/shift');
  }, [data?.hasOpenShift]);

  async function onStart() {
    if (starting) return;
    setStarting(true);
    try {
      await startShift(db, Date.now());
      router.replace('/shift');
    } catch (e) {
      showError('No se pudo iniciar el turno', e);
      setStarting(false);
    }
  }

  if (!data || data.hasOpenShift) return <Screen>{null}</Screen>;

  const { last, rate } = data;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onLongPress={__DEV__ ? () => loadDemoData(db, reload) : undefined} accessible={false}>
          <Image
            source={require('@/assets/images/logo-lockup.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Gesty"
          />
        </Pressable>
        <View style={styles.headerButtons}>
          <IconButton Icon={History} label="Historial" onPress={() => router.push('/history')} />
          <IconButton Icon={Settings} label="Ajustes" onPress={() => router.push('/settings')} />
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.band} pointerEvents="none" />
        <Text style={styles.date}>{formatLongDate(Date.now())}</Text>
        <View style={styles.ring}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Iniciar turno"
            onPress={onStart}
            disabled={starting}
            style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
          >
            <Play color={colors.onAccent} size={48} strokeWidth={2.5} />
            <Text style={styles.startLabel}>{'Iniciar\nturno'}</Text>
          </Pressable>
        </View>
        <Text style={styles.rate}>
          Tarifa: <Text style={styles.rateValue}>{formatMoney(rate)}</Text> por envío
        </Text>
      </View>

      {last && last.endedAt !== null && (
        <Card>
          <View style={styles.lastHeader}>
            <Text style={typography.overline}>Último turno</Text>
            <Text style={styles.lastWhen}>
              {formatShortDate(last.startedAt)} · {formatTimeRange(last.startedAt, last.endedAt)}
            </Text>
          </View>
          <View style={styles.lastFigures}>
            <View>
              <Text style={styles.lastNumber}>{last.deliveryCount}</Text>
              <Text style={typography.bodyMuted}>{last.deliveryCount === 1 ? 'envío' : 'envíos'}</Text>
            </View>
            <View style={styles.alignEnd}>
              <Text style={styles.lastNumber}>{formatMoney(shiftTotal(last.deliveryCount, last.rate))}</Text>
              <Text style={typography.bodyMuted}>cobrado</Text>
            </View>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    zIndex: 1,
  },
  logo: {
    height: sizes.logoHeight,
    // Lockup PNG is 607×160.
    width: (sizes.logoHeight * 607) / 160,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  band: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 2000,
    height: BAND_THICKNESS,
    marginLeft: -1000,
    marginTop: -BAND_THICKNESS / 2,
    backgroundColor: colors.accent,
    opacity: bandOpacity,
    transform: [{ rotate: BAND_ANGLE }],
  },
  date: {
    ...typography.bodyMuted,
  },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    width: sizes.startButton,
    height: sizes.startButton,
    borderRadius: sizes.startButton / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  startButtonPressed: {
    opacity: 0.85,
  },
  startLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSize.display,
    lineHeight: fontSize.display * 1.15,
    color: colors.onAccent,
    textAlign: 'center',
  },
  rate: {
    ...typography.bodyMuted,
  },
  rateValue: {
    fontFamily: fonts.bold,
    color: colors.text,
  },
  lastHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    columnGap: spacing.md,
    rowGap: spacing.xs,
  },
  lastWhen: {
    ...typography.label,
    ...tabularNums,
  },
  lastFigures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.lg,
  },
  lastNumber: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.numberLarge,
    color: colors.text,
    ...tabularNums,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
});
