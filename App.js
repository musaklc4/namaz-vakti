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

const FALLBACK = {
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

const METHODS = {
  TR: 13,
  SA: 4,
  EG: 5,
  PK: 1,
  IN: 1,
  BD: 1,
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

const pad = (n) => String(n).padStart(2, '0');

function dateString(date = new Date()) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function formatTime(value) {
  return value ? value.substring(0, 5) : '--:--';
}

function minutes(value) {
  if (!value) return 0;
  const [h, m] = value.substring(0, 5).split(':').map(Number);
  return h * 60 + m;
}

function countdown(seconds) {
  if (seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function nextPrayer(timings, now) {
  if (!timings) return null;

  const current =
    now.getHours() * 60 +
    now.getMinutes() +
    now.getSeconds() / 60;

  for (const prayer of PRAYERS) {
    const value = timings[prayer.key];
    if (!value) continue;

    const target = minutes(value);

    if (target > current) {
      return {
        ...prayer,
        time: value,
        seconds: Math.floor((target - current) * 60),
      };
    }
  }

  const first = PRAYERS.find((p) => timings[p.key]);
  if (!first) return null;

  const target = minutes(timings[first.key]);

  return {
    ...first,
    time: timings[first.key],
    seconds: Math.floor(
      (24 * 60 - current + target) * 60
    ),
  };
}

function qiblaBearing(lat, lon) {
  const a = (lat * Math.PI) / 180;
  const b = (KAABA.latitude * Math.PI) / 180;
  const dl =
    ((KAABA.longitude - lon) * Math.PI) / 180;

  const y = Math.sin(dl);
  const x =
    Math.cos(a) * Math.tan(b) -
    Math.sin(a) * Math.cos(dl);

  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function direction(degrees) {
  if (degrees >= 337.5 || degrees < 22.5) return 'Kuzey';
  if (degrees < 67.5) return 'Kuzeydoğu';
  if (degrees < 112.5) return 'Doğu';
  if (degrees < 157.5) return 'Güneydoğu';
  if (degrees < 202.5) return 'Güney';
  if (degrees < 247.5) return 'Güneybatı';
  if (degrees < 292.5) return 'Batı';
  return 'Kuzeybatı';
}

function normalize(value) {
  return ((value % 360) + 360) % 360;
}

export default function App() {
  const [location, setLocation] = useState(null);
  const [timings, setTimings] = useState(null);
  const [hijri, setHijri] = useState(null);
  const [heading, setHeading] = useState(0);
  const [qibla, setQibla] = useState(null);

  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let alive = true;

    async function getLocation() {
      try {
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          setLocation(FALLBACK);
          setQibla(
            qiblaBearing(
              FALLBACK.latitude,
              FALLBACK.longitude
            )
          );
          setError(
            'Konum izni verilmedi. İstanbul kullanılıyor.'
          );
          return;
        }

        const result =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

        let city = 'Bulunduğun Konum';
        let country = '';
        let countryCode = '';

        try {
          const addresses =
            await Location.reverseGeocodeAsync({
              latitude: result.coords.latitude,
              longitude: result.coords.longitude,
            });

          if (addresses?.length) {
            const a = addresses[0];

            city =
              a.city ||
              a.subregion ||
              a.region ||
              city;

            country = a.country || '';
            countryCode = a.isoCountryCode || '';
          }
        } catch {}

        const data = {
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          city,
          country,
          countryCode,
        };

        if (alive) {
          setLocation(data);
          setQibla(
            qiblaBearing(
              data.latitude,
              data.longitude
            )
          );
          setError(null);
        }
      } catch (e) {
        setLocation(FALLBACK);
        setQibla(
          qiblaBearing(
            FALLBACK.latitude,
            FALLBACK.longitude
          )
        );
        setError(
          'Konum alınamadı. İstanbul kullanılıyor.'
        );
      } finally {
        if (alive) setLocationLoading(false);
      }
    }

    getLocation();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!location) return;

    let alive = true;

    async function getPrayerTimes() {
      try {
        setLoading(true);

        const method =
          METHODS[location.countryCode] || 3;

        const url =
          `https://api.aladhan.com/v1/timings/${dateString()}` +
          `?latitude=${location.latitude}` +
          `&longitude=${location.longitude}` +
          `&method=${method}`;

        const response = await fetch(url);
        const json = await response.json();

        if (!response.ok || json.code !== 200) {
          throw new Error();
        }

        if (alive) {
          setTimings(json.data.timings);
          setHijri(json.data.date?.hijri);
          setError(null);
        }
      } catch {
        if (alive) {
          setError(
            'Namaz vakitleri alınırken sorun oluştu.'
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    getPrayerTimes();

    return () => {
      alive = false;
    };
  }, [
    location?.latitude,
    location?.longitude,
    location?.countryCode,
  ]);

  useEffect(() => {
    let subscription;

    async function compass() {
      try {
        const permission =
          await Location.getForegroundPermissionsAsync();

        if (permission.status !== 'granted') return;

        subscription =
          await Location.watchHeadingAsync((data) => {
            let value = data.trueHeading;

            if (
              typeof value !== 'number' ||
              value < 0
            ) {
              value = data.magHeading;
            }

            if (
              typeof value === 'number' &&
              value >= 0
            ) {
              setHeading(value);
            }
          });
      } catch {}
    }

    compass();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(
      () => setNow(new Date()),
      1000
    );

    return () => clearInterval(timer);
  }, []);

  const next = useMemo(
    () => nextPrayer(timings, now),
    [timings, now]
  );

  const hijriText = hijri
    ? `${hijri.day} ${hijri.month?.ar || ''} ${hijri.year}`
    : 'Hicri tarih yükleniyor...';

  const today = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);

  if (activeTab === 'quran') {
    return (
      <QuranScreen
        onBack={() => setActiveTab('home')}
      />
    );
  }

  if (activeTab === 'qibla') {
    return (
      <QiblaScreen
        location={location}
        qibla={qibla}
        heading={heading}
        onBack={() => setActiveTab('home')}
        setActiveTab={setActiveTab}
      />
    );
  }

  if (activeTab === 'zikr') {
    return (
      <Placeholder
        icon="📿"
        title="Zikir"
        text="Zikir ve tesbihat bölümü hazırlanıyor."
        onBack={() => setActiveTab('home')}
        activeTab="zikr"
        setActiveTab={setActiveTab}
      />
    );
  }

  if (activeTab === 'duas') {
    return (
      <Placeholder
        icon="🤲"
        title="Dualar"
        text="Günlük dualar bölümü hazırlanıyor."
        onBack={() => setActiveTab('home')}
        activeTab="duas"
        setActiveTab={setActiveTab}
      />
    );
  }

  if (activeTab === 'settings') {
    return (
      <Placeholder
        icon="⚙️"
        title="Ayarlar"
        text="Dil, hesaplama yöntemi ve bildirim ayarları burada olacak."
        onBack={() => setActiveTab('home')}
        activeTab="settings"
        setActiveTab={setActiveTab}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#061218"
      />

      <ScrollView
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Esselâmü Aleyküm
            </Text>

            <Text style={styles.title}>
              Namaz Vakti
            </Text>
          </View>

          <View style={styles.location}>
            <Text>📍</Text>

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
          <Text style={styles.date}>
            {today}
          </Text>

          <Text style={styles.hijri}>
            {hijriText}
          </Text>
        </View>

        {error && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              {error}
            </Text>
          </View>
        )}

        <View style={styles.nextCard}>
          <Text style={styles.small}>
            SIRADAKİ NAMAZ
          </Text>

          <View style={styles.nextRow}>
            <Text style={styles.nextName}>
              {next
                ? `${next.icon} ${next.name}`
                : 'Namaz'}
            </Text>

            <Text style={styles.nextTime}>
              {next ? formatTime(next.time) : '--:--'}
            </Text>
          </View>

          <View style={styles.line} />

          <Text style={styles.small}>
            Kalan süre
          </Text>

          <Text style={styles.count}>
            {next
              ? countdown(next.seconds)
              : '--:--:--'}
          </Text>
        </View>

        <Text style={styles.section}>
          Bugünün Vakitleri
        </Text>

        <View style={styles.grid}>
          {PRAYERS.map((p) => {
            const active = next?.key === p.key;

            return (
              <View
                key={p.key}
                style={[
                  styles.prayer,
                  active && styles.prayerActive,
                ]}
              >
                <Text style={styles.prayerIcon}>
                  {p.icon}
                </Text>

                <Text style={styles.prayerName}>
                  {p.name}
                </Text>

                <Text
                  style={[
                    styles.prayerTime,
                    active && styles.activeText,
                  ]}
                >
                  {loading
                    ? '--:--'
                    : formatTime(
                        timings?.[p.key]
                      )}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>
          Hızlı Erişim
        </Text>

        <View style={styles.quickGrid}>
          <Quick
            icon="📖"
            title="Kur'an"
            subtitle="Oku"
            onPress={() => setActiveTab('quran')}
          />

          <Quick
            icon="📿"
            title="Zikir"
            subtitle="Tesbihat"
            onPress={() => setActiveTab('zikr')}
          />

          <Quick
            icon="🤲"
            title="Dualar"
            subtitle="Günlük dualar"
            onPress={() => setActiveTab('duas')}
          />

          <Quick
            icon="🧭"
            title="Kıble"
            subtitle="Canlı pusula"
            onPress={() => setActiveTab('qibla')}
          />
        </View>

        <TouchableOpacity
          style={styles.qiblaCard}
          onPress={() => setActiveTab('qibla')}
        >
          <View>
            <Text style={styles.qiblaTitle}>
              🧭 Kıble Pusulası
            </Text>

            <Text style={styles.qiblaSub}>
              Kâbe yönünü canlı olarak göster
            </Text>
          </View>

          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.quote}>
          <Text style={styles.quoteMark}>❝</Text>

          <Text style={styles.quoteText}>
            “Şüphesiz namaz, müminler üzerine vakitleri
            belirlenmiş bir farzdır.”
          </Text>

          <Text style={styles.quoteSource}>
            Nisâ Suresi, 103
          </Text>
        </View>
      </ScrollView>

      <BottomBar
        activeTab="home"
        setActiveTab={setActiveTab}
      />
    </SafeAreaView>
  );
}

function QuranScreen({ onBack }) {
  const [surahs, setSurahs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [ayahs, setAyahs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [surahLoading, setSurahLoading] =
    useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    fetch('https://api.alquran.cloud/v1/surah')
      .then((r) => r.json())
      .then((json) => {
        if (json.code !== 200) throw new Error();

        if (alive) {
          setSurahs(json.data || []);
          setError(null);
        }
      })
      .catch(() => {
        if (alive) {
          setError(
            'Sureler yüklenemedi. İnternet bağlantısını kontrol edin.'
          );
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  async function openSurah(surah) {
    setSelected(surah);
    setAyahs([]);
    setSurahLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.alquran.cloud/v1/surah/${surah.number}/quran-uthmani`
      );

      const json = await response.json();

      if (json.code !== 200) throw new Error();

      setAyahs(json.data?.ayahs || []);
    } catch {
      setError(
        'Sure yüklenemedi. Lütfen tekrar deneyin.'
      );
    } finally {
      setSurahLoading(false);
    }
  }

  if (selected) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#061218"
        />

        <ScrollView
          contentContainerStyle={styles.container}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                Kur’an-ı Kerim
              </Text>

              <Text style={styles.title}>
                {selected.englishName}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.back}
              onPress={() => {
                setSelected(null);
                setAyahs([]);
              }}
            >
              <Text style={styles.backText}>
                ←
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.surahHeader}>
            <Text style={styles.surahArabic}>
              {selected.name}
            </Text>

            <Text style={styles.surahTitle}>
              {selected.englishName}
            </Text>

            <Text style={styles.surahTranslation}>
              {selected.englishNameTranslation}
            </Text>

            <Text style={styles.surahInfo}>
              {selected.numberOfAyahs} ayet •{' '}
              {selected.revelationType === 'Meccan'
                ? 'Mekkî'
                : 'Medenî'}
            </Text>
          </View>

          {surahLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator
                size="large"
                color="#E8B04B"
              />

              <Text style={styles.loadingText}>
                Sure yükleniyor...
              </Text>
            </View>
          ) : (
            ayahs.map((ayah) => (
              <View
                key={ayah.number}
                style={styles.ayah}
              >
                <View style={styles.ayahTop}>
                  <View style={styles.number}>
                    <Text style={styles.numberText}>
                      {ayah.numberInSurah}
                    </Text>
                  </View>

                  <Text style={styles.reference}>
                    {selected.number}:
                    {ayah.numberInSurah}
                  </Text>
                </View>

                <Text style={styles.arabic}>
                  {ayah.text}
                </Text>
              </View>
            ))
          )}

          {error && (
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                {error}
              </Text>
            </View>
          )}
        </ScrollView>

        <BottomBar
          activeTab="quran"
          setActiveTab={onBack}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#061218"
      />

      <ScrollView
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Kur’an-ı Kerim
            </Text>

            <Text style={styles.title}>
              114 Sure
            </Text>
          </View>

          <TouchableOpacity
            style={styles.back}
            onPress={onBack}
          >
            <Text style={styles.backText}>
              ←
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quranIntro}>
          <Text style={styles.quranIntroTitle}>
            📖 Kur’an-ı Kerim
          </Text>

          <Text style={styles.quranIntroText}>
            114 sureyi Arapça metinleriyle okuyabilirsin.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator
              size="large"
              color="#E8B04B"
            />

            <Text style={styles.loadingText}>
              Sureler yükleniyor...
            </Text>
          </View>
        ) : (
          surahs.map((surah) => (
            <TouchableOpacity
              key={surah.number}
              style={styles.surahCard}
              onPress={() => openSurah(surah)}
              activeOpacity={0.8}
            >
              <View style={styles.number}>
                <Text style={styles.numberText}>
                  {surah.number}
                </Text>
              </View>

              <View style={styles.surahInfoBox}>
                <Text style={styles.surahName}>
                  {surah.englishName}
                </Text>

                <Text style={styles.surahTranslation}>
                  {surah.englishNameTranslation}
                </Text>

                <Text style={styles.surahCount}>
                  {surah.numberOfAyahs} ayet
                </Text>
              </View>

              <Text style={styles.surahArabicSmall}>
                {surah.name}
              </Text>
            </TouchableOpacity>
          ))
        )}

        {error && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              {error}
            </Text>
          </View>
        )}
      </ScrollView>

      <BottomBar
        activeTab="quran"
        setActiveTab={onBack}
      />
    </SafeAreaView>
  );
}

function QiblaScreen({
  location,
  qibla,
  heading,
  onBack,
  setActiveTab,
}) {
  const rotation =
    qibla === null
      ? 0
      : normalize(qibla - heading);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#061218"
      />

      <ScrollView
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Kıble
            </Text>

            <Text style={styles.title}>
              Kıble Pusulası
            </Text>
          </View>

          <TouchableOpacity
            style={styles.back}
            onPress={onBack}
          >
            <Text style={styles.backText}>
              ←
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.qiblaMain}>
          <Text style={styles.qiblaMainTitle}>
            🕋 Kâbe yönü
          </Text>

          <Text style={styles.qiblaLocation}>
            {location?.city || 'Konum'}
          </Text>

          <View style={styles.compass}>
            <Text style={[styles.compassN, styles.n]}>
              N
            </Text>

            <Text style={[styles.compassN, styles.e]}>
              E
            </Text>

            <Text style={[styles.compassN, styles.s]}>
              S
            </Text>

            <Text style={[styles.compassN, styles.w]}>
              W
            </Text>

            <View
              style={[
                styles.needle,
                {
                  transform: [
                    {
                      rotate: `${rotation}deg`,
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.needleText}>
                ▲
              </Text>
            </View>

            <View style={styles.compassCenter}>
              <Text style={styles.kaaba}>
                🕋
              </Text>
            </View>
          </View>

          <Text style={styles.degree}>
            {qibla === null
              ? '--'
              : `${Math.round(qibla)}°`}
          </Text>

          <Text style={styles.direction}>
            {qibla === null
              ? 'Hesaplanıyor...'
              : direction(qibla)}
          </Text>

          <Text style={styles.hint}>
            Telefonunu yatay tut ve pusulayı Kâbe yönüne
            çevir.
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

function Placeholder({
  icon,
  title,
  text,
  onBack,
  activeTab,
  setActiveTab,
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#061218"
      />

      <ScrollView
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {title}
            </Text>

            <Text style={styles.title}>
              Namaz Vakti
            </Text>
          </View>

          <TouchableOpacity
            style={styles.back}
            onPress={onBack}
          >
            <Text style={styles.backText}>
              ←
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>
            {icon}
          </Text>

          <Text style={styles.placeholderTitle}>
            {title}
          </Text>

          <Text style={styles.placeholderText}>
            {text}
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

function Quick({
  icon,
  title,
  subtitle,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.quick}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.quickIcon}>
        {icon}
      </Text>

      <Text style={styles.quickTitle}>
        {title}
      </Text>

      <Text style={styles.quickSub}>
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
    <View style={styles.bottom}>
      <Bottom
        icon="⌂"
        title="Ana Sayfa"
        active={activeTab === 'home'}
        onPress={() => setActiveTab('home')}
      />

      <Bottom
        icon="📖"
        title="Kur'an"
        active={activeTab === 'quran'}
        onPress={() => setActiveTab('quran')}
      />

      <Bottom
        icon="🧭"
        title="Kıble"
        active={activeTab === 'qibla'}
        onPress={() => setActiveTab('qibla')}
      />

      <Bottom
        icon="⚙️"
        title="Ayarlar"
        active={activeTab === 'settings'}
        onPress={() => setActiveTab('settings')}
      />
    </View>
  );
}

function Bottom({
  icon,
  title,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.bottomButton}
      onPress={onPress}
    >
      <Text
        style={[
          styles.bottomIcon,
          active && styles.activeText,
        ]}
      >
        {icon}
      </Text>

      <Text
        style={[
          styles.bottomTitle,
          active && styles.activeText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#061218',
  },

  container: {
    padding: 18,
    paddingBottom: 110,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  greeting: {
    color: '#9BA7A8',
    fontSize: 13,
    marginBottom: 4,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },

  location: {
    maxWidth: 145,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10242A',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#193139',
  },

  locationText: {
    color: '#D9E0E0',
    fontSize: 11,
    marginLeft: 5,
    flexShrink: 1,
  },

  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10242A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#28464D',
  },

  backText: {
    color: '#E8B04B',
    fontSize: 25,
  },

  dateCard: {
    backgroundColor: '#0D1B20',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#193139',
  },

  date: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  hijri: {
    color: '#E8B04B',
    fontSize: 13,
    marginTop: 6,
  },

  warning: {
    backgroundColor: '#2A2115',
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#5B4424',
  },

  warningText: {
    color: '#E8B04B',
    fontSize: 12,
    lineHeight: 18,
  },

  nextCard: {
    backgroundColor: '#10242A',
    borderRadius: 24,
    padding: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#28464D',
  },

  small: {
    color: '#7F9194',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '800',
  },

  nextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 7,
  },

  nextName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },

  nextTime: {
    color: '#E8B04B',
    fontSize: 25,
    fontWeight: '800',
  },

  line: {
    height: 1,
    backgroundColor: '#294047',
    marginVertical: 16,
  },

  count: {
    color: '#E8B04B',
    fontSize: 31,
    fontWeight: '800',
    marginTop: 5,
  },

  section: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  prayer: {
    width: '31.5%',
    backgroundColor: '#0D1B20',
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#193139',
  },

  prayerActive: {
    backgroundColor: '#182F32',
    borderColor: '#E8B04B',
  },

  prayerIcon: {
    fontSize: 20,
    marginBottom: 6,
  },

  prayerName: {
    color: '#9BA7A8',
    fontSize: 11,
  },

  prayerTime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 5,
  },

  activeText: {
    color: '#E8B04B',
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  quick: {
    width: '48.2%',
    backgroundColor: '#0D1B20',
    borderRadius: 18,
    padding: 16,
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

  quickSub: {
    color: '#7F9194',
    fontSize: 11,
    marginTop: 4,
  },

  qiblaCard: {
    backgroundColor: '#10242A',
    borderRadius: 19,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#28464D',
  },

  qiblaTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  qiblaSub: {
    color: '#8D9A9C',
    fontSize: 11,
    marginTop: 5,
  },

  arrow: {
    color: '#E8B04B',
    fontSize: 25,
  },

  quote: {
    backgroundColor: '#0D1B20',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#193139',
  },

  quoteMark: {
    color: '#E8B04B',
    fontSize: 28,
  },

  quoteText: {
    color: '#F2F0E9',
    fontSize: 15,
    lineHeight: 24,
  },

  quoteSource: {
    color: '#8D9A9C',
    fontSize: 11,
    marginTop: 10,
  },

  qiblaMain: {
    backgroundColor: '#10242A',
    borderRadius: 26,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#28464D',
  },

  qiblaMainTitle: {
    color: '#E8B04B',
    fontSize: 20,
    fontWeight: '800',
  },

  qiblaLocation: {
    color: '#8D9A9C',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 18,
  },

  compass: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: '#36535A',
    backgroundColor: '#0B1A1F',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  compassN: {
    position: 'absolute',
    color: '#A8B5B6',
    fontWeight: '800',
  },

  n: { top: 14 },
  e: { right: 18 },
  s: { bottom: 14 },
  w: { left: 18 },

  needle: {
    position: 'absolute',
    width: 5,
    height: 100,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  needleText: {
    color: '#E8B04B',
    fontSize: 38,
  },

  compassCenter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#172C31',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8B04B',
  },

  kaaba: {
    fontSize: 25,
  },

  degree: {
    color: '#E8B04B',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 18,
  },

  direction: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 3,
  },

  hint: {
    color: '#8D9A9C',
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 16,
  },

  quranIntro: {
    backgroundColor: '#10242A',
    borderRadius: 20,
    padding: 19,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#28464D',
  },

  quranIntroTitle: {
    color: '#E8B04B',
    fontSize: 20,
    fontWeight: '800',
  },

  quranIntroText: {
    color: '#9BA7A8',
    fontSize: 13,
    marginTop: 7,
  },

  surahCard: {
    backgroundColor: '#0D1B20',
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#193139',
    flexDirection: 'row',
    alignItems: 'center',
  },

  number: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#18272A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  numberText: {
    color: '#E8B04B',
    fontSize: 12,
    fontWeight: '800',
  },

  surahInfoBox: {
    flex: 1,
  },

  surahName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  surahTranslation: {
    color: '#7F8C8E',
    fontSize: 11,
    marginTop: 3,
  },

  surahCount: {
    color: '#8D9A9C',
    fontSize: 10,
    marginTop: 4,
  },

  surahArabicSmall: {
    color: '#E8B04B',
    fontSize: 19,
    maxWidth: 105,
    marginLeft: 7,
  },

  surahHeader: {
    backgroundColor: '#10242A',
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#28464D',
  },

  surahArabic: {
    color: '#E8B04B',
    fontSize: 29,
    fontWeight: '800',
  },

  surahTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 7,
  },

  surahInfo: {
    color: '#8D9A9C',
    fontSize: 12,
    marginTop: 7,
  },

  loading: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  loadingText: {
    color: '#8D9A9C',
    marginTop: 12,
  },

  ayah: {
    backgroundColor: '#0D1B20',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#193139',
  },

  ayahTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  reference: {
    color: '#66777A',
    fontSize: 10,
  },

  arabic: {
    color: '#F4F1E8',
    fontSize: 24,
    lineHeight: 46,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  placeholder: {
    backgroundColor: '#10242A',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#28464D',
  },

  placeholderIcon: {
    fontSize: 50,
    marginBottom: 16,
  },

  placeholderTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },

  placeholderText: {
    color: '#8D9A9C',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },

  bottom: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    height: 70,
    borderRadius: 23,
    backgroundColor: '#0D1B20',
    borderWidth: 1,
    borderColor: '#28464D',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  bottomButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bottomIcon: {
    color: '#718084',
    fontSize: 19,
  },

  bottomTitle: {
    color: '#718084',
    fontSize: 9,
    marginTop: 4,
  },
});
