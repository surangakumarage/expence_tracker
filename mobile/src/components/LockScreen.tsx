import { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../data/settings';
import { hashPin } from '../lib/platform';
import { Button, ErrorText, Input, T } from './ui';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { settings, theme: t } = useSettings();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    if ((await hashPin(pin, settings.pinSalt ?? '')) === settings.pinHash) onUnlock();
    else {
      setError('Incorrect PIN');
      setPin('');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', padding: 32, gap: 16 }}>
      <View style={{ alignSelf: 'center', backgroundColor: t.primary, borderRadius: 16, padding: 14 }}>
        <Ionicons name="lock-closed" size={26} color="#fff" />
      </View>
      <T bold size={20} style={{ textAlign: 'center' }}>Enter PIN</T>
      <Input
        value={pin}
        onChangeText={(v) => {
          setPin(v.replace(/\D/g, ''));
          setError('');
        }}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        autoFocus
        onSubmitEditing={submit}
        accessibilityLabel="PIN"
        style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Unlock" onPress={submit} disabled={pin.length < 4} />
    </View>
  );
}
