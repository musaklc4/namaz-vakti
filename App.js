import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';

const KAABA = {
  latitude: 21.422487,
  longitude: 39.826206,
};

const FALLBACK_LOCATION = {
  latitude: 41.0082,
  longitude: 28.9784,
  city: 'İstanbul',
  country: 'Türkiye',
  countryCode: 'TR',
};

const PRAYERS = [
  { key: 'Fajr', name: 'Sabah', icon: '🌅' },
  { key: 'Sunrise', name: 'Güneş', icon: '☀️' },
  { key: 'Dhuhr', name: 'Öğle', icon: '🕌' },
  { key: 'Asr', name: 'İkindi', icon: '🌤️' },
  { key: 'Maghrib', name: 'Akşam', icon: '🌇' },
  { key: 'Isha', name: 'Yatsı', icon: '🌙' },
];

const METHOD_BY_COUNTRY = {
  TR: 13,
  SA: 4,
  EG: 5,
  PK: 1,
  BD: 1,
  IN: 1,
  US: 2,
  CA: 2,
  GB: 3,
  DE: 3,
  FR: 3,
  NL: 3,
  BE: 3,
  AT: 3,
  CH: 3,
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function getDateString(date = new Date()) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function formatTime(time) {
  if (!time) return '--:--';
  return time.substring(0, 5);
}

function timeToMinutes(time) {
  if (!time) return 0;

  const clean = time.substring(0, 5);
  const [hours, minutes] = clean.split(':').map(Number);

  return hours * 60 + minutes;
}

function formatCountdown(seconds) {
  if (seconds <= 0) return '00:00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

function getMethod(countryCode) {
  return METHOD_BY_COUNTRY[countryCode] || 3;
}

function getNextPrayer(timings, now) {
  if (!timings) return null;

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes() +
    now.getSeconds() / 60;

  for (const prayer of PRAYERS) {
    if (!timings[prayer.key]) continue;

    const prayerMinutes = timeToMinutes(timings[prayer.key]);

    if (prayerMinutes > currentMinutes) {
      return {
        ...prayer,
        time: timings[prayer.key],
        seconds: Math.floor(
          (prayerMinutes - currentMinutes) * 60
        ),
      };
    }
  }

  const firstPrayer = PRAYERS.find(
    (prayer) => timings[prayer.key]
  );

  if (!firstPrayer) return null;

  const firstMinutes =
    timeToMinutes(timings[firstPrayer.key]);

  const seconds = Math.floor(
    (24 * 60 - currentMinutes + firstMinutes) * 60
  );

  return {
    ...firstPrayer,
    time: timings[firstPrayer.key],
    seconds,
  };
}

function calculateQiblaBearing(latitude, longitude) {
  const lat1 = (latitude * Math.PI) / 180;
  const lat2 = (KAABA.latitude * Math.PI) / 180;

  const deltaLongitude =
    ((KAABA.longitude - longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLongitude);

  const x =
    Math.cos(lat1) * Math.tan(lat2) -
    Math.sin(lat1) * Math.cos(deltaLongitude);

  let bearing =
    (Math.atan2(y, x) * 180) / Math.PI;

  bearing = (bearing + 360) % 360;

  return bearing;
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function getDirectionName(degrees) {
  if (degrees >= 337.5 || degrees < 22.5) return 'Kuzey';
  if (degrees < 67.5) return 'Kuzeydoğu';
  if (degrees < 112.5) return 'Doğu';
  if (degrees < 157.5) return 'Güneydoğu';
  if (degrees < 202.5) return 'Güney';
  if (degrees < 247.5) return 'Güneybatı';
  if (degrees < 292.5) return 'Batı';
  return 'Kuzeybatı';
}

function countryCodeFromCountry(country) {
  const countries = {
    Türkiye: 'TR',
    Turkey: 'TR',
    Germany: 'DE',
    Deutschland: 'DE',
    France: 'FR',
    Frankreich: 'FR',
    Netherlands: 'NL',
    Belgium: 'BE',
    Austria: 'AT',
    Switzerland: 'CH',
    Canada: 'CA',
    India: 'IN',
    Pakistan: 'PK',
    Bangladesh: 'BD',
    Egypt: 'EG',
    'Saudi Arabia': 'SA',
    'United States': 'US',
    'United Kingdom': 'GB',
  };

  return countries[country] || '';
}

export default function App() {
  const [location, setLocation] = useState(null);
  const [timings, setTimings] = useState(null);
  const [hijri, setHijri] = useState(null);

  const [heading, setHeading] = useState(0);
  const [qiblaBearing, setQiblaBearing] = useState(null);

  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);

  const [error, setError] = useState(null);
  const [compassError, setCompassError] = useState(null);

  const [now, setNow] = useState(new Date());
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    let mounted = true;

    async function loadLocation() {
      try {
        setLocationLoading(true);

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          if (mounted) {
            setLocation(FALLBACK_LOCATION);
            setError(
              'Konum izni verilmedi. İstanbul varsayılan konum olarak kullanılıyor.'
            );
          }

          return;
        }

        const current =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

        const latitude = current.coords.latitude;
        const longitude = current.coords.longitude;

        let city = 'Bulunduğun Konum';
        let country = '';
        let countryCode = '';

        try {
          const addresses =
            await Location.reverseGeocodeAsync({
              latitude,
              longitude,
            });

          if (addresses?.length) {
            const address = addresses[0];

            city =
              address.city ||
              address.subregion ||
              address.region ||
              'Bulunduğun Konum';

            country = address.country || '';

            countryCode =
              address.isoCountryCode ||
              countryCodeFromCountry(country);
          }
        } catch (geocodeError) {
          console.log('Geocode error:', geocodeError);
        }

        if (mounted) {
          setLocation({
            latitude,
            longitude,
            city,
            country,
            countryCode,
          });

          setQiblaBearing(
            calculateQiblaBearing(
              latitude,
              longitude
            )
          );
        }
      } catch (locationError) {
        console.log(locationError);

        if (mounted) {
          setLocation(FALLBACK_LOCATION);
          setQiblaBearing(
            calculateQiblaBearing(
              FALLBACK_LOCATION.latitude,
              FALLBACK_LOCATION.longitude
            )
          );

          setError(
            'Konum alınamadı. İstanbul varsayılan konum olarak kullanılıyor.'
          );
        }
      } finally {
        if (mounted) {
          setLocationLoading(false);
        }
      }
    }

    loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!location) return;

    let mounted = true;

    async function loadPrayerTimes() {
      try {
        setLoading(true);

        const date = getDateString();
        const method = getMethod(
          location.countryCode
        );

        const url =
          `https://api.aladhan.com/v1/timings/${date}` +
          `?latitude=${location.latitude}` +
          `&longitude=${location.longitude}` +
          `&method=${method}`;

        const response = await fetch(url);
        const json = await response.json();

        if (!response.ok || json.code !== 200) {
          throw new Error(
            'Namaz vakitleri alınamadı.'
          );
        }

        if (mounted) {
          setTimings(json.data.timings);
          setHijri(
            json.data.date?.hijri || null
          );
        }
      } catch (fetchError) {
        console.log(fetchError);

        if (mounted) {
          setError(
            'Namaz vakitleri alınırken bir sorun oluştu.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPrayerTimes();

    return () => {
      mounted = false;
    };
  }, [
    location?.latitude,
    location?.longitude,
    location?.countryCode,
  ]);

  useEffect(() => {
    let mounted = true;
    let subscription = null;

    async function startCompass() {
      try {
        const permission =
          await Location.getForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          if (mounted) {
            setCompassError(
              'Pusula için konum izni gerekiyor.'
            );
          }

          return;
        }

        subscription =
          await Location.watchHeadingAsync(
            (data) => {
              if (!mounted) return;

              let currentHeading =
                data.trueHeading;

              if (
                typeof currentHeading !== 'number' ||
                currentHeading < 0
              ) {
                currentHeading = data.magHeading;
              }

              if (
                typeof currentHeading === 'number' &&
                currentHeading >= 0
              ) {
                setHeading(currentHeading);
                setCompassError(null);
              }
            }
          );
      } catch (headingError) {
        console.log(headingError);

        if (mounted) {
          setCompassError(
            'Pusula başlatılamadı. Telefonu hareket ettirip tekrar deneyin.'
          );
        }
      }
    }

    startCompass();

    return () => {
      mounted = false;

      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const nextPrayer = useMemo(
    () => getNextPrayer(timings, now),
    [timings, now]
  );

  const countdown = nextPrayer
    ? formatCountdown(nextPrayer.seconds)
    : '--:--:--';

  const hijriText = hijri
    ? `${hijri.day} ${
        hijri.month?.ar || ''
      } ${hijri.year}`
    : 'Hicri tarih yükleniyor...';

  const todayText = new Intl.DateTimeFormat(
    'tr-TR',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }
  ).format(now);

  const qiblaDirection =
    qiblaBearing !== null
      ? normalizeAngle(
          qiblaBearing - heading
        )
      : 0;

  const qiblaDegrees =
    qiblaBearing !== null
      ? Math.round(qiblaBearing)
      : '--';

  if (activeTab === 'qibla') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#061218"
        />

        <ScrollView
          contentContainerStyle={
            styles.container
          }
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                Kıble
              </Text>

              <Text style={styles.appTitle}>
                Kıble Pusulası
              </Text>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                setActiveTab('home')
              }
            >
              <Text style={styles.backText}>
                ←
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.qiblaMainCard}>
            <Text style={styles.qiblaMainTitle}>
              🕋 Kâbe yönü
            </Text>

            <Text style={styles.qiblaLocation}>
              {location?.city || 'Konum'}
            </Text>

            <View style={styles.compass}>
              <View
                style={[
                  styles.compassNeedle,
                  {
                    transform: [
                      {
                        rotate: `${qiblaDirection}deg`,
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.needle}>
                  ▲
                </Text>
              </View>

              <View style={styles.compassCenter}>
                <Text style={styles.kaaba}>
                  🕋
                </Text>
              </View>

              <Text
                style={[
                  styles.compassLabel,
                  styles.north,
                ]}
              >
                N
              </Text>

              <Text
                style={[
                  styles.compassLabel,
                  styles.east,
                ]}
              >
                E
              </Text>

              <Text
                style={[
                  styles.compassLabel,
                  styles.south,
                ]}
              >
                S
              </Text>

              <Text
                style={[
                  styles.compassLabel,
                  styles.west,
                ]}
              >
                W
              </Text>
            </View>

            <Text style={styles.qiblaDegrees}>
              {qiblaDegrees}°
            </Text>

            <Text style={styles.qiblaDirectionText}>
              {qiblaBearing !== null
                ? getDirectionName(
                    qiblaBearing
                  )
                : 'Hesaplanıyor...'}
            </Text>

            {compassError ? (
              <View
                style={styles.warningCard}
              >
                <Text
                  style={styles.warningText}
                >
                  {compassError}
                </Text>
              </View>
            ) : null}

            <Text style={styles.compassHint}>
              Telefonunu yatay tut ve ekrandaki
              yön göstergesini Kâbe yönüne
              çevir.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              🧭 Canlı pusula
            </Text>

            <Text style={styles.infoText}>
              Pusula yönü telefon sensörlerinden
              alınır. Konum izni, gerçek kuzey
              bilgisinin kullanılabilmesi için
              gereklidir.
            </Text>
          </View>
        </ScrollView>

        <BottomBar
          activeTab="qibla"
          setActiveTab={setActiveTab}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#061218"
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Esselâmü Aleyküm
            </Text>

            <Text style={styles.appTitle}>
              Namaz Vakti
            </Text>
          </View>

          <View style={styles.locationBadge}>
            <Text style={styles.locationIcon}>
              📍
            </Text>

            <Text
              style={styles.locationText}
              numberOfLines={1}
            >
              {locationLoading
                ? 'Konum aranıyor...'
                : location?.city || 'Konum'}
            </Text>
          </View>
        </View>

        <View style={styles.dateCard}>
          <Text style={styles.dateTitle}>
            {todayText}
          </Text>

          <Text style={styles.hijriText}>
            {hijriText}
          </Text>
        </View>

        {error ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.nextCard}>
          <View style={styles.nextTop}>
            <View>
              <Text style={styles.smallLabel}>
                SIRADAKİ NAMAZ
              </Text>

              <Text
                style={styles.nextPrayerName}
              >
                {nextPrayer
                  ? `${nextPrayer.icon} ${nextPrayer.name}`
                  : 'Namaz'}
              </Text>
            </View>

            <Text style={styles.nextTime}>
              {nextPrayer
                ? formatTime(nextPrayer.time)
                : '--:--'}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.countdownLabel}>
            Kalan süre
          </Text>

          <Text style={styles.countdown}>
            {countdown}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Bugünün Vakitleri
        </Text>

        <View style={styles.prayerGrid}>
          {PRAYERS.map((prayer) => {
            const isNext =
              nextPrayer?.key === prayer.key;

            return (
              <View
                key={prayer.key}
                style={[
                  styles.prayerCard,
                  isNext &&
                    styles.prayerCardActive,
                ]}
              >
                <Text style={styles.prayerIcon}>
                  {prayer.icon}
                </Text>

                <Text style={styles.prayerName}>
                  {prayer.name}
                </Text>

                <Text
                  style={[
                    styles.prayerTime,
                    isNext &&
                      styles.prayerTimeActive,
                  ]}
                >
                  {loading
                    ? '--:--'
                    : formatTime(
                        timings?.[prayer.key]
                      )}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>
          Hızlı Erişim
        </Text>

        <View style={styles.quickGrid}>
          <QuickCard
            icon="📖"
            title="Kur'an"
            subtitle="Oku"
            onPress={() =>
              setActiveTab('quran')
            }
          />

          <QuickCard
            icon="📿"
            title="Zikir"
            subtitle="Tesbihat"
            onPress={() =>
              setActiveTab('zikr')
            }
          />

          <QuickCard
            icon="🤲"
            title="Dualar"
            subtitle="Günlük dualar"
            onPress={() =>
              setActiveTab('duas')
            }
          />

          <QuickCard
            icon="🧭"
            title="Kıble"
            subtitle="Canlı pusula"
            onPress={() =>
              setActiveTab('qibla')
            }
          />
        </View>

        <TouchableOpacity
          style={styles.qiblaCard}
          onPress={() =>
            setActiveTab('qibla')
          }
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.qiblaTitle}>
              🧭 Kıble Pusulası
            </Text>

            <Text style={styles.qiblaSubtitle}>
              Kâbe yönünü canlı olarak göster
            </Text>
          </View>

          <Text style={styles.arrow}>
            →
          </Text>
        </TouchableOpacity>

        <View style={styles.quoteCard}>
          <Text style={styles.quoteIcon}>
            ❝
          </Text>

          <Text style={styles.quote}>
            “Şüphesiz namaz, müminler üzerine
            vakitleri belirlenmiş bir farzdır.”
          </Text>

          <Text style={styles.quoteSource}>
            Nisâ Suresi, 103
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            🌍 Uluslararası
          </Text>

          <Text style={styles.infoText}>
            Uygulama bulunduğun konumu kullanır
            ve bulunduğun yere göre namaz
            vakitlerini hesaplar.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Namaz Vakti • Dünya'nın her yerinde 🕌
          </Text>
        </View>
      </ScrollView>

      <BottomBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </SafeAreaView>
  );
}

function QuickCard({
  icon,
  title,
  subtitle,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.quickCard}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text style={styles.quickIcon}>
        {icon}
      </Text>

      <Text style={styles.quickTitle}>
        {title}
      </Text>

      <Text style={styles.quickSubtitle}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function BottomBar({
  activeTab,
  setActiveTab,
}) {
  return (
    <View style={styles.bottomBar}>
      <BottomButton
        icon="⌂"
        title="Ana Sayfa"
        active={activeTab === 'home'}
        onPress={() =>
          setActiveTab('home')
        }
      />

      <BottomButton
        icon="📖"
        title="Kur'an"
        active={activeTab === 'quran'}
        onPress={() =>
          setActiveTab('quran')
        }
      />

      <BottomButton
        icon="🧭"
        title="Kıble"
        active={activeTab === 'qibla'}
        onPress={() =>
          setActiveTab('qibla')
        }
      />

      <BottomButton
        icon="⚙️"
        title="Ayarlar"
        active={activeTab === 'settings'}
        onPress={() =>
          setActiveTab('settings')
        }
      />
    </View>
  );
}

function BottomButton({
  icon,
  title,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.bottomButton}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text
        style={[
          styles.bottomIcon,
          active && styles.bottomActive,
        ]}
      >
        {icon}
      </Text>

      <Text
        style={[
          styles.bottomTitle,
          active && styles.bottomActive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#061218',
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 110,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  greeting: {
    color: '#A8B3B5',
    fontSize: 14,
    marginBottom: 5,
  },

  appTitle: {
    color: '#E8B04B',
    fontSize: 29,
    fontWeight: '800',
  },

  locationBadge: {
    maxWidth: 145,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101F24',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  locationIcon: {
    fontSize: 13,
    marginRight: 5,
  },

  locationText: {
    color: '#D9E0E1',
    fontSize: 12,
    fontWeight: '600',
  },

  dateCard: {
    backgroundColor: '#0D1B20',
    borderRadius: 18,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#193139',
  },

  dateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  hijriText: {
    color: '#9BA7A8',
    fontSize: 13,
    marginTop: 5,
  },

  warningCard: {
    backgroundColor: '#302719',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#6C5227',
  },

  warningText: {
    color: '#E8C984',
    fontSize: 12,
    lineHeight: 18,
  },

  nextCard: {
    backgroundColor: '#10242A',
    borderRadius: 24,
    padding: 21,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#28464D',
  },

  nextTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  smallLabel: {
    color: '#8D9A9C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 8,
  },

  nextPrayerName: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },

  nextTime: {
    color: '#E8B04B',
    fontSize: 28,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: '#28444B',
    marginVertical: 17,
  },

  countdownLabel: {
    color: '#8D9A9C',
    fontSize: 12,
    textAlign: 'center',
  },

  countdown: {
    color: '#E8B04B',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
  },

  prayerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  prayerCard: {
    width: '48.2%',
    backgroundColor: '#0D1B20',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#193139',
  },

  prayerCardActive: {
    borderColor: '#C89235',
    backgroundColor: '#18272A',
  },

  prayerIcon: {
    fontSize: 19,
    marginBottom: 7,
  },

  prayerName: {
    color: '#9BA7A8',
    fontSize: 13,
    fontWeight: '600',
  },

  prayerTime: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 5,
  },

  prayerTimeActive: {
    color: '#E8B04B',
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  quickCard: {
    width: '48.2%',
    backgroundColor: '#0D1B20',
    borderRadius: 18,
    padding: 17,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#193139',
  },

  quickIcon: {
    fontSize: 24,
    marginBottom: 9,
  },

  quickTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  quickSubtitle: {
    color: '#7F8C8E',
    fontSize: 11,
    marginTop: 3,
  },

  qiblaCard: {
    backgroundColor: '#10242A',
    borderRadius: 19,
    padding: 18,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#28464D',
  },

  qiblaTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  qiblaSubtitle: {
    color: '#8D9A9C',
    fontSize: 12,
    marginTop: 5,
  },

  arrow: {
    color: '#E8B04B',
    fontSize: 30,
    fontWeight: '700',
  },

  quoteCard: {
    backgroundColor: '#0D1B20',
    borderRadius: 19,
    padding: 19,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#193139',
  },

  quoteIcon: {
    color: '#E8B04B',
    fontSize: 25,
  },

  quote: {
    color: '#E2E8E8',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 4,
  },

  quoteSource: {
    color: '#899799',
    fontSize: 12,
    marginTop: 10,
  },

  infoCard: {
    backgroundColor: '#0D1B20',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },

  infoTitle: {
    color: '#E8B04B',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 7,
  },

  infoText: {
    color: '#9BA7A8',
    fontSize: 12,
    lineHeight: 19,
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 8,
  },

  footerText: {
    color: '#566568',
    fontSize: 11,
  },

  qiblaMainCard: {
    backgroundColor: '#10242A',
    borderRadius: 26,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#28464D',
  },

  qiblaMainTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
  },

  qiblaLocation: {
    color: '#8D9A9C',
    fontSize: 13,
    marginTop: 5,
  },

  compass: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: '#35545B',
    marginTop: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#0A1B20',
  },

  compassNeedle: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  needle: {
    color: '#E8B04B',
    fontSize: 42,
    marginTop: -8,
  },

  compassCenter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#142C32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8B04B',
  },

  kaaba: {
    fontSize: 27,
  },

  compassLabel: {
    position: 'absolute',
    color: '#9BA7A8',
    fontSize: 15,
    fontWeight: '800',
  },

  north: {
    top: 15,
  },

  east: {
    right: 17,
  },

  south: {
    bottom: 15,
  },

  west: {
    left: 17,
  },

  qiblaDegrees: {
    color: '#E8B04B',
    fontSize: 35,
    fontWeight: '800',
    marginTop: 20,
  },

  qiblaDirectionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 3,
  },

  compassHint: {
    color: '#8D9A9C',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 18,
    maxWidth: 310,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10242A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backText: {
    color: '#E8B04B',
    fontSize: 25,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 82,
    backgroundColor: '#08171C',
    borderTopWidth: 1,
    borderTopColor: '#193139',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
  },

  bottomButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '25%',
  },

  bottomIcon: {
    fontSize: 20,
    color: '#718083',
    marginBottom: 4,
  },

  bottomTitle: {
    fontSize: 10,
    color: '#718083',
    fontWeight: '600',
  },

  bottomActive: {
    color: '#E8B04B',
  },
}); 
