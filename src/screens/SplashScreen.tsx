import React from 'react';
import { View, StyleSheet } from 'react-native';
import SriYantraVideo from '../components/SriYantraVideo';

/**
 * Full-screen Sri Yantra intro video splash page.
 */
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <SriYantraVideo loop={true} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
