import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';

const ISTANBUL = {
  latitude: 41.0082,
  longitude: 28.9784,
};

const prayerMap = [
  { key: 'Fajr', name: 'İmsak' },
  { key: 'Sunrise', name: 'Güneş' },
  { key: 'Dhuhr', name: 'Öğle' },
  { key: 'Asr', name: 'İkindi' },
  { key: 'Maghrib', name: 'Akşam' },
  { key: 'Isha', name: 'Yatsı' },
];

function formatDate(date) {
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
}

function getRemaining(target) {
  const now = new Date();
  const diff = target - now;

  if (diff <= 0) return '00:00:00';

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours,
    minutes,
    seconds,
  ]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

export default function App() {
  const [timings, setTimings] = useState(null);
  const [hijri, setHijri] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchPrayerTimes();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function fetchPrayerTimes() {
    try {
      setLoading(true);

      const today = new Date();
      const date = `${String(today.getDate()).padStart(2, '0')}-${String(
        today.getMonth() + 1
      ).padStart(2, '0')}-${today.getFullYear()}`;

      const url =
        `https://api.aladhan.com/v1/timings/${date}` +
        `?latitude=${ISTANBUL.latitude}` +
        `&longitude=${ISTANBUL.longitude}` +
        `&method=13`;

      const response = await fetch(url);
      const json = await response.json();

      if (json.code !== 200) {
        throw new Error('Vakitler alınamadı');
      }

      setTimings(json.data.timings);

      const h = json.data.date.hijri;
      setHijri(`${h.day} ${h.month.ar} ${h.year}`);

      setError(false);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const prayers = useMemo(() => {
    if (!timings) return [];

    return prayerMap.map((item) => ({
      ...item,
      time: timings[item.key]?.slice(0, 5) || '--:--',
    }));
  }, [timings]);

  const nextPrayer = useMemo(() => {
    if (!prayers.length) return null;

    for (const prayer of prayers) {
      const [hour, minute] = prayer.time.split(':').map(Number);

      const target = new Date(now);
      target.setHours(hour, minute, 0, 0);

      if (target > now) {
        return {
          ...prayer,
          target,
        };
      }
    }

    const first = prayers[0];
    const [hour, minute] = first.time.split(':').map(Number);

    const target = new Date(now);
    target.setDate(target.getDate() + 1);
    target.setHours(hour, minute, 0, 0);

    return {
      ...first,
      target,
    };
  }, [prayers, now]);

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
          <Text style={styles.hijri}>
            {hijri || 'Hicrî tarih yükleniyor...'}
          </Text>

          <Text style={styles.date}>
            {formatDate(now)}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>
              Namaz vakitleri yükleniyor...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.loadingCard}>
            <Text style={styles.errorText}>
              Vakitler alınamadı.
            </Text>
            <Text style={styles.loadingText}>
              İnternet bağlantınızı kontrol edin.
            </Text>
          </View>
        ) : (
          <>
            {nextPrayer && (
              <View style={styles.nextCard}>
                <View>
                  <Text style={styles.smallLabel}>
                    SIRADAKİ NAMAZ
                  </Text>

                  <Text style={styles.nextName}>
                    {nextPrayer.name}
                  </Text>

                  <Text style={styles.nextTime}>
                    {nextPrayer.time}
                  </Text>
                </View>

                <View style={styles.countdown}>
                  <Text style={styles.countdownLabel}>
                    KALAN SÜRE
                  </Text>

                  <Text style={styles.countdownText}>
                    {getRemaining(nextPrayer.target)}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>
              Bugünün Vakitleri
            </Text>

            <View style={styles.prayerGrid}>
              {prayers.map((prayer) => (
                <View
                  key={prayer.key}
                  style={[
                    styles.prayerCard,
                    nextPrayer?.key === prayer.key &&
                      styles.activePrayer,
                  ]}
                >
                  <Text style={styles.prayerName}>
                    {prayer.name}
                  </Text>

                  <Text style={styles.prayerTime}>
                    {prayer.time}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>
          Hızlı Erişim
        </Text>

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
            Şüphesiz namaz, müminler üzerine vakitleri
            belirlenmiş bir farzdır.
          </Text>

          <Text style={styles.source}>
            Nisâ Suresi, 103
          </Text>
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

  loadingCard: {
    backgroundColor: '#0D1B21',
    borderRadius: 24,
    padding: 30,
    marginBottom: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#183038',
  },

  loadingText: {
    color: '#9BA7A8',
    marginTop: 12,
    fontSize: 14,
  },

  errorText: {
    color: '#E8B04B',
    fontSize: 16,
    fontWeight: '700',
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
    alignItems: 'center',
    marginBottom: 10,
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
  },

  quote: {
    color: '#D8DFDF',
    fontSize: 15,
    lineHeight: 23,
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
