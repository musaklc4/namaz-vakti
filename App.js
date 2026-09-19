import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';

const prayers = [
  { name: 'İmsak', time: '05:12' },
  { name: 'Güneş', time: '06:39' },
  { name: 'Öğle', time: '13:05' },
  { name: 'İkindi', time: '16:34' },
  { name: 'Akşam', time: '19:18' },
  { name: 'Yatsı', time: '20:42' },
];

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Esselâmü Aleyküm</Text>
            <Text style={styles.title}>Namaz Vakti</Text>
          </View>

          <View style={styles.locationBadge}>
            <Text style={styles.locationIcon}>⌖</Text>
            <Text style={styles.location}>İstanbul</Text>
          </View>
        </View>

        <View style={styles.dateCard}>
          <Text style={styles.hijri}>17 Rebîülevvel 1448</Text>
          <Text style={styles.date}>19 Eylül 2026 • Cumartesi</Text>
        </View>

        <View style={styles.nextCard}>
          <View>
            <Text style={styles.smallLabel}>SIRADAKİ NAMAZ</Text>
            <Text style={styles.nextName}>İkindi</Text>
            <Text style={styles.nextTime}>16:34</Text>
          </View>

          <View style={styles.countdown}>
            <Text style={styles.countdownLabel}>KALAN SÜRE</Text>
            <Text style={styles.countdownText}>03:13:42</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Bugünün Vakitleri</Text>

        <View style={styles.prayerGrid}>
          {prayers.map((prayer, index) => (
            <View
              key={prayer.name}
              style={[
                styles.prayerCard,
                index === 3 && styles.activePrayer,
              ]}
            >
              <Text style={styles.prayerName}>{prayer.name}</Text>
              <Text style={styles.prayerTime}>{prayer.time}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Hızlı Erişim</Text>

        <View style={styles.quickGrid}>
          <View style={styles.quickCard}>
            <Text style={styles.quickIcon}>☾</Text>
            <Text style={styles.quickTitle}>Kur'an</Text>
            <Text style={styles.quickSub}>Oku ve dinle</Text>
          </View>

          <View style={styles.quickCard}>
            <Text style={styles.quickIcon}>◉</Text>
            <Text style={styles.quickTitle}>Zikir</Text>
            <Text style={styles.quickSub}>Tesbihat</Text>
          </View>

          <View style={styles.quickCard}>
            <Text style={styles.quickIcon}>✦</Text>
            <Text style={styles.quickTitle}>Dualar</Text>
            <Text style={styles.quickSub}>Günlük dualar</Text>
          </View>

          <View style={styles.quickCard}>
            <Text style={styles.quickIcon}>☽</Text>
            <Text style={styles.quickTitle}>Kıble</Text>
            <Text style={styles.quickSub}>Kıble yönü</Text>
          </View>
        </View>

        <View style={styles.quoteCard}>
          <Text style={styles.quoteMark}>“</Text>
          <Text style={styles.quote}>
            Şüphesiz namaz, müminler üzerine vakitleri belirlenmiş bir farzdır.
          </Text>
          <Text style={styles.source}>Nisâ Suresi, 103</Text>
        </View>

        <View style={styles.bottomNav}>
          <View style={styles.navItem}>
            <Text style={styles.navIconActive}>⌂</Text>
            <Text style={styles.navTextActive}>Ana Sayfa</Text>
          </View>

          <View style={styles.navItem}>
            <Text style={styles.navIcon}>◷</Text>
            <Text style={styles.navText}>Vakitler</Text>
          </View>

          <View style={styles.navItem}>
            <Text style={styles.navIcon}>☾</Text>
            <Text style={styles.navText}>Kur'an</Text>
          </View>

          <View style={styles.navItem}>
            <Text style={styles.navIcon}>☷</Text>
            <Text style={styles.navText}>Daha</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#061218',
  },

  container: {
    flex: 1,
    backgroundColor: '#061218',
  },

  content: {
    padding: 20,
    paddingBottom: 35,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  greeting: {
    color: '#9BA7A8',
    fontSize: 14,
    marginBottom: 5,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
  },

  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101E24',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
  },

  locationIcon: {
    color: '#E8B04B',
    fontSize: 18,
    marginRight: 5,
  },

  location: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  dateCard: {
    backgroundColor: '#0D1B21',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#183038',
  },

  hijri: {
    color: '#E8B04B',
    fontSize: 17,
    fontWeight: '700',
  },

  date: {
    color: '#879597',
    fontSize: 13,
    marginTop: 6,
  },

  nextCard: {
    backgroundColor: '#10252A',
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#24484A',
    marginBottom: 28,
  },

  smallLabel: {
    color: '#9BA7A8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  nextName: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 7,
  },

  nextTime: {
    color: '#E8B04B',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 3,
  },

  countdown: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  countdownLabel: {
    color: '#879597',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },

  countdownText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 13,
  },

  prayerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  prayerCard: {
    width: '31.5%',
    backgroundColor: '#0D1B21',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#183038',
  },

  activePrayer: {
    borderColor: '#E8B04B',
    backgroundColor: '#15252A',
  },

  prayerName: {
    color: '#9BA7A8',
    fontSize: 12,
    marginBottom: 7,
  },

  prayerTime: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  quickCard: {
    width: '48%',
    backgroundColor: '#0D1B21',
    borderRadius: 18,
    padding: 17,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#183038',
  },

  quickIcon: {
    color: '#E8B04B',
    fontSize: 24,
    marginBottom: 9,
  },

  quickTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  quickSub: {
    color: '#7F9092',
    fontSize: 11,
    marginTop: 4,
  },

  quoteCard: {
    backgroundColor: '#0D1B21',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#183038',
  },

  quoteMark: {
    color: '#E8B04B',
    fontSize: 35,
    lineHeight: 30,
  },

  quote: {
    color: '#D8DFDF',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 4,
  },

  source: {
    color: '#7F9092',
    fontSize: 11,
    marginTop: 12,
  },

  bottomNav: {
    backgroundColor: '#0D1B21',
    borderRadius: 22,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#183038',
  },

  navItem: {
    alignItems: 'center',
    minWidth: 65,
  },

  navIcon: {
    color: '#718183',
    fontSize: 20,
  },

  navIconActive: {
    color: '#E8B04B',
    fontSize: 20,
  },

  navText: {
    color: '#718183',
    fontSize: 10,
    marginTop: 5,
  },

  navTextActive: {
    color: '#E8B04B',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
  },
});
