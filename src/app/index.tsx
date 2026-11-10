import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, tabularNums } from '@/theme';

// Placeholder until the home screen is built (feat/home-screen).
export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gesty</Text>
      <Text style={styles.number}>$ 45.000</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  title: { fontFamily: fonts.bold, fontSize: fontSize.heading, color: colors.text },
  number: { fontFamily: fonts.numberBold, fontSize: fontSize.numberHuge, color: colors.accentText, ...tabularNums },
});
