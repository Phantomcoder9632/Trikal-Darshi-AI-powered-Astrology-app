# 📱 Trikal Darshi — Native Android (Kotlin + Jetpack Compose) Blueprint

> **Master Architecture & Implementation Specification for Android Engineering Agents**  
> Use this document as the single source of truth to build the native Android application for **Trikal Darshi**, matching the exact luxury Vedic manuscript aesthetic, 9 divisional charts (Kundali), 11-chapter streaming RAG interpretations, and interactive Jyotish AI chatbot.

---

## 1. 🛠️ Tech Stack & Build Dependencies

Modern Android standards with **100% Kotlin**, **Jetpack Compose (Material 3)**, and reactive unidirectional data flow (UDF / MVI / MVVM).

### 1.1 Core Platform & Frameworks
| Layer | Technology | Recommended Version / Artifact | Role |
| :--- | :--- | :--- | :--- |
| **Language** | Kotlin | `2.0.x+` (with Compose Compiler plugin) | Null-safe, modern Android programming |
| **UI Toolkit** | Jetpack Compose + Material 3 | `androidx.compose.material3:material3` | Declarative UI, smooth 120Hz animations |
| **Architecture** | Clean Architecture + MVVM / UDF | Android Jetpack Lifecycle & ViewModel | State separation, single source of truth |
| **DI Engine** | Hilt | `com.google.dagger:hilt-android:2.51+` | Dependency injection across ViewModels & Repos |
| **Networking** | Retrofit 2 + OkHttp 4 | `com.squareup.retrofit2:retrofit:2.11.0` | REST API Client + SSE Streaming |
| **Serialization**| KotlinX Serialization | `org.jetbrains.kotlinx:kotlinx-serialization-json` | High performance JSON parsing |
| **Async & Stream**| Kotlin Coroutines & Flow | `kotlinx-coroutines-android` | Asynchronous operations, streaming token buffer |
| **Local Storage** | Room Database | `androidx.room:room-ktx:2.6.x` | Offline caching of charts & interpretations |
| **Secure KeyStore**| AndroidX Security Crypto | `androidx.security:security-crypto:1.1.0-alpha06` | Storing JWT bearer tokens & user sessions |
| **Chart Rendering**| Compose Canvas (`androidx.compose.ui.graphics`) | Native Canvas API | North-Indian diamond Kundali geometric rendering |
| **Markdown / Text**| RichText Compose | `com.halilibo.compose-richtext:richtext-commonmark` | Rendering AI chapter prose, tables, & callouts |
| **Navigation** | Navigation Compose | `androidx.navigation:navigation-compose:2.8.x` | Type-Safe Nav with Kotlin Serialization |
| **Authentication**| Google Identity Credential Manager | `androidx.credentials:credentials:1.3.x` | Native One-Tap & Google sign-in |

### 1.2 `build.gradle.kts` (app level) Template
```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt.android)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.trikaldarshi.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.trikaldarshi.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    // Jetpack Compose & M3
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.ui.tooling.preview)
    debugImplementation(libs.androidx.ui.tooling)

    // Lifecycle & Navigation
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.navigation.compose)

    // Dependency Injection
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.androidx.hilt.navigation.compose)

    // Network & Streaming
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging.interceptor)
    implementation(libs.okhttp.sse) // For EventSource streaming

    // JSON Serialization
    implementation(libs.kotlinx.serialization.json)

    // Local DB & Secure Storage
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)
    implementation(libs.androidx.security.crypto)

    // Markdown Parser
    implementation("com.halilibo.compose-richtext:richtext-commonmark:0.17.0")
    implementation("com.halilibo.compose-richtext:richtext-ui-material3:0.17.0")
}
```

---

## 2. 📁 Complete Android Project Folder Structure

Follow this standard Clean Architecture directory hierarchy inside `app/src/main/java/com/trikaldarshi/app/`:

```
com.trikaldarshi.app/
│
├── TrikalApp.kt                        # Application class (@HiltAndroidApp)
├── MainActivity.kt                     # Single Activity with Compose host
│
├── core/                               # Cross-cutting foundational modules
│   ├── network/
│   │   ├── ApiClient.kt                # OkHttpClient configuration (Auth interceptor, SSE, timeouts)
│   │   ├── AuthInterceptor.kt         # Injects "Authorization: Bearer <JWT>"
│   │   ├── SseStreamHandler.kt         # Helper to consume chunked / SSE stream to Flow<String>
│   │   └── NetworkExceptions.kt
│   ├── security/
│   │   └── TokenStorage.kt             # EncryptedSharedPreferences wrapper for JWT & User Profile
│   ├── theme/
│   │   ├── Color.kt                    # Vedic manuscript palette tokens (Parchment, Indigo, Gold)
│   │   ├── Type.kt                     # Typography stack (Fraunces serif & Inter sans)
│   │   ├── Shape.kt                    # Rounded card borders (16dp, 24dp)
│   │   └── Theme.kt                    # TrikalDarshiTheme composable wrapper
│   └── util/
│       ├── DateFormatters.kt           # Parsing DOB and "HH:MM" time strings
│       └── Constants.kt                # Base API URL, default coordinates
│
├── data/                               # Data layer (Remote + Local data sources)
│   ├── model/                          # DTOs with @Serializable
│   │   ├── ChartDto.kt                 # Full natal payload (Planets, Vargas, Dasha, Panchanga)
│   │   ├── InterpretationDto.kt        # Chapter interpretation payloads
│   │   ├── ChatMessageDto.kt           # AI chat turns
│   │   ├── UserDto.kt                  # Auth response & profile
│   │   └── ProgressDto.kt              # Background generation state
│   ├── local/                          # Room persistence
│   │   ├── TrikalDatabase.kt
│   │   ├── dao/
│   │   │   ├── ChartDao.kt             # Offline chart persistence
│   │   │   ├── InterpretationDao.kt    # Cached chapter narratives
│   │   │   └── ChatDao.kt              # Persisted chat history
│   │   └── entity/
│   │       ├── ChartEntity.kt
│   │       ├── InterpretationEntity.kt
│   │       └── ChatMessageEntity.kt
│   ├── remote/                         # Retrofit Service interfaces
│   │   ├── TrikalApiService.kt         # REST endpoints (/chart, /auth, /progress)
│   │   └── StreamingApiService.kt     # Streaming endpoints (/interpret, /chat)
│   └── repository/                     # Repository implementations
│       ├── ChartRepositoryImpl.kt
│       ├── InterpretationRepositoryImpl.kt
│       ├── ChatRepositoryImpl.kt
│       └── AuthRepositoryImpl.kt
│
├── domain/                             # Business logic & Domain contracts
│   ├── model/                          # Clean domain entities
│   │   ├── Chart.kt
│   │   ├── Planet.kt
│   │   ├── VargaChart.kt
│   │   ├── DashaPeriod.kt
│   │   └── InterpretationChapter.kt
│   ├── repository/                     # Abstract interfaces
│   │   ├── ChartRepository.kt
│   │   ├── InterpretationRepository.kt
│   │   ├── ChatRepository.kt
│   │   └── AuthRepository.kt
│   └── usecase/                        # Single-purpose interactors
│       ├── GenerateChartUseCase.kt
│       ├── GetChartDetailsUseCase.kt
│       ├── StreamInterpretationUseCase.kt
│       ├── StreamChatMessageUseCase.kt
│       └── AuthenticateUserUseCase.kt
│
├── presentation/                       # UI layer (Jetpack Compose Screens & ViewModels)
│   ├── navigation/
│   │   ├── Screen.kt                   # Sealed class destinations (Home, Dashboard, Chat, Profile)
│   │   └── AppNavHost.kt               # NavHost declaration with Compose transitions
│   │
│   ├── common/                         # Shared UI Components
│   │   ├── TrikalAppBar.kt             # Top App Bar with gold star glyph & profile avatar
│   │   ├── ShimmerLoading.kt           # Manuscript gold shimmering placeholder skeleton
│   │   ├── OfflineReadingBadge.kt      # Banner indicating cached ephemeris calculation
│   │   └── ErrorDialog.kt
│   │
│   ├── home/                           # Landing & Birth Entry Screen
│   │   ├── HomeScreen.kt
│   │   ├── HomeViewModel.kt
│   │   ├── components/
│   │   │   ├── BirthDetailsForm.kt     # Name, DatePicker, TimePicker, City Autocomplete
│   │   │   └── ObservatoryHeroCard.kt  # Cosmic Astrolabe header visual
│   │   └── HomeUiState.kt
│   │
│   ├── dashboard/                      # Core Dashboard Screen
│   │   ├── DashboardScreen.kt          # Collapsible Observatory + Tab bar + Prose reader
│   │   ├── DashboardViewModel.kt
│   │   ├── DashboardUiState.kt
│   │   └── components/
│   │       ├── CosmicSummaryCard.kt    # 20-chip Panchanga/Dosha/Dasha grid
│   │       ├── KundaliChartCanvas.kt   # North Indian diamond SVG/Canvas renderer
│   │       ├── VargaSelectorBar.kt     # D1, D9, D10, D4, D7, D30 horizontal pill selector
│   │       ├── ChapterTabsBar.kt       # 11-Tab horizontal sticky navigation bar
│   │       ├── ChapterProseCard.kt     # Streaming markdown chapter content
│   │       ├── RemedyTripathCard.kt    # Tab 8 Vedic, Lal Kitab, Numerology 3-column cards
│   │       └── ClassicalFactsFallback.kt # Real Swiss Ephemeris data card when offline
│   │
│   ├── chat/                           # Jyotish AI Chatbot
│   │   ├── ChatScreen.kt
│   │   ├── ChatViewModel.kt
│   │   ├── components/
│   │   │   ├── ChatBubble.kt
│   │   │   └── ChatInputBar.kt
│   │   └── ChatUiState.kt
│   │
│   └── profile/                        # Profile & Saved Kundali Vault
│       ├── ProfileScreen.kt
│       ├── ProfileViewModel.kt
│       └── components/
│           ├── SavedChartItem.kt
│           └── LanguageDialog.kt
│
└── di/                                 # Hilt Dependency Injection Modules
    ├── AppModule.kt
    ├── NetworkModule.kt
    ├── DatabaseModule.kt
    └── RepositoryModule.kt
```

---

## 3. 🎨 Design System: Colors, Typography & Theme

Replicate the exact **Parchment & Royal Temple Indigo** color scheme:

### 3.1 Color Tokens (`core/theme/Color.kt`)
```kotlin
package com.trikaldarshi.app.core.theme

import androidx.compose.ui.graphics.Color

// Background & Surfaces (Vedic Manuscript Parchment)
val PaperBackground = Color(0xFFFBF6EA)       // Base warm parchment background
val SurfaceBright = Color(0xFFFFFDF6)         // Elevated manuscript cards
val SurfaceContainerLow = Color(0xFFFAF5E8)   // Sub-cards, chart canvas frame
val SurfaceContainer = Color(0xFFEFE7D2)      // Subtle input surfaces

// Primary (Temple Midnight Indigo)
val TempleIndigo = Color(0xFF022454)          // Major headlines, brand title, icons
val IndigoContainer = Color(0xFF1F3A6B)       // Active tab backgrounds, prominent buttons
val BlueWash = Color(0xFFEBF1FA)              // Soft blue badge background

// Secondary & Accents (Vedic Gold & Ochre)
val VedicGold = Color(0xFFD9A63C)             // Star glyphs (✦), glowing borders, accents
val OchreAntique = Color(0xFF7B5800)          // Folio subtitles, classical references, key labels
val GoldLight = Color(0xFFF0DFAF)             // Subtle glow and pill backgrounds

// Outlines & Borders
val GoldenSandBorder = Color(0xFFE8D5A7)      // Card borders, divider hairlines, Kundali grid

// Text Colors
val TextOnSurface = Color(0xFF0E1A37)         // High contrast charcoal indigo for prose
val TextMuted = Color(0xFF4A567A)             // Degree timestamps, secondary notes

// Dignity Alerts
val DignityDebilitated = Color(0xFFBA1A1A)    // Classical red for debilitated grahas/doshas
val DignityExalted = Color(0xFF7B5800)        // Gold for exalted grahas
val DignityOwn = Color(0xFF1F3A6B)            // Indigo for own-house grahas
```

### 3.2 Typography Stack (`core/theme/Type.kt`)
Store font files inside `res/font/`:
- `fraunces_bold.ttf`
- `fraunces_semibold.ttf`
- `inter_regular.ttf`
- `inter_medium.ttf`
- `inter_semibold.ttf`

```kotlin
package com.trikaldarshi.app.core.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.trikaldarshi.app.R

val Fraunces = FontFamily(
    Font(R.font.fraunces_bold, FontWeight.Bold),
    Font(R.font.fraunces_semibold, FontWeight.SemiBold)
)

val Inter = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_medium, FontWeight.Medium),
    Font(R.font.inter_semibold, FontWeight.SemiBold)
)

val TrikalTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = Fraunces,
        fontWeight = FontWeight.Bold,
        fontSize = 26.sp,
        color = TempleIndigo,
        lineHeight = 32.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = Fraunces,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        color = TempleIndigo
    ),
    titleMedium = TextStyle(
        fontFamily = Inter,
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
        color = TempleIndigo
    ),
    bodyLarge = TextStyle(
        fontFamily = Inter,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 26.sp,
        color = TextOnSurface
    ),
    bodySmall = TextStyle(
        fontFamily = Inter,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        color = TextMuted
    ),
    labelSmall = TextStyle(
        fontFamily = Inter,
        fontWeight = FontWeight.Bold,
        fontSize = 10.sp,
        letterSpacing = 1.sp,
        color = OchreAntique
    )
)
```

---

## 4. 📐 Native Kundali Chart Renderer (`KundaliChartCanvas.kt`)

In Android, render the North-Indian chart using a high-performance **Compose `Canvas`** rather than a webview:

### Coordinate Math & North Indian Geometry
The North-Indian diamond chart consists of:
1. Outer square bounding box (`0,0` to `size.width, size.height`).
2. Two major diagonal lines connecting opposite corners: `(0,0) -> (W,H)` and `(W,0) -> (0,H)`.
3. Diamond formed by connecting midpoints: `(W/2, 0) -> (W, H/2) -> (W/2, H) -> (0, H/2) -> (W/2, 0)`.
4. House 1 (Lagna) is the central top diamond.

```kotlin
@Composable
fun KundaliChartCanvas(
    modifier: Modifier = Modifier,
    planets: List<PlanetUiModel>,
    ascendantSignNum: Int,
    onHouseClick: (houseNum: Int) -> Unit = {}
) {
    Box(
        modifier = modifier
            .aspectRatio(1f)
            .background(SurfaceContainerLow, shape = RoundedCornerShape(12.dp))
            .border(1.5.dp, GoldenSandBorder, shape = RoundedCornerShape(12.dp))
            .padding(8.dp)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height

            val gridPaint = Stroke(width = 2.dp.toPx())

            // 1. Outer Square
            drawRect(color = GoldenSandBorder, style = gridPaint)

            // 2. Corner Diagonals
            drawLine(GoldenSandBorder, Offset(0f, 0f), Offset(w, h), strokeWidth = 2.dp.toPx())
            drawLine(GoldenSandBorder, Offset(w, 0f), Offset(0f, h), strokeWidth = 2.dp.toPx())

            // 3. Central Diamond (connecting midpoints)
            val path = Path().apply {
                moveTo(w / 2f, 0f)
                lineTo(w, h / 2f)
                lineTo(w / 2f, h)
                lineTo(0f, h / 2f)
                close()
            }
            drawPath(path, GoldenSandBorder, style = gridPaint)

            // 4. House Numbers & Planet Glyphs plotted at House Center Offsets
            // House 1: (w/2, h/4)
            // House 2: (w/4, h/8) ... matching HOUSE_COORDS from web
        }
    }
}
```

---

## 5. 🌊 Real-Time Streaming Interpretation via Coroutine Flows

To handle the chunked SSE stream from `POST /interpret/{chart_id}/{tab_number}`:

### 5.1 Streaming Repository Implementation
```kotlin
class InterpretationRepositoryImpl @Inject constructor(
    private val api: StreamingApiService,
    private val dao: InterpretationDao
) : InterpretationRepository {

    override fun streamInterpretation(
        chartId: String,
        tabNumber: Int,
        language: String
    ): Flow<String> = channelFlow {
        // 1. Check local cache first
        val cached = dao.getInterpretation(chartId, tabNumber, language)
        if (cached != null) {
            send(cached.content)
            return@channelFlow
        }

        // 2. Stream from network
        val response = api.streamInterpretation(chartId, tabNumber, mapOf("language" to language))
        val byteStream = response.byteStream()
        val reader = BufferedReader(InputStreamReader(byteStream))
        val buffer = StringBuilder()

        try {
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                line?.let { chunk ->
                    buffer.append(chunk)
                    send(chunk) // Emit chunk instantly to UI
                }
            }
            // 3. Save to local Room DB upon stream completion
            if (buffer.length >= 1000) {
                dao.insertInterpretation(
                    InterpretationEntity(
                        chartId = chartId,
                        tabNumber = tabNumber,
                        language = language,
                        content = buffer.toString()
                    )
                )
            }
        } finally {
            reader.close()
            byteStream.close()
        }
    }.flowOn(Dispatchers.IO)
}
```

---

## 6. 📱 UI Screens Specification

### 6.1 `HomeScreen.kt` (Birth Chamber)
- **Top Astrolabe Hero**: Title *"TRIKAL DARSHI"*, golden star `✦`, *"11 Soul Dimensions"*.
- **Birth Entry Card**:
  - Full Name (`OutlinedTextField`)
  - Date of Birth with Material 3 `DatePickerDialog`
  - Time of Birth with Material 3 `TimePickerDialog` (formatted as `"HH:MM"`)
  - City of Birth with asynchronous geocoding search or *"Use Current GPS Location"* button
  - Language selection (English, Hindi, Bengali)
- **Submit CTA**: Luxury Indigo button: *"Reveal Kundali & Blueprint"*, navigates to `/dashboard/{chart_id}` upon generation.

### 6.2 `DashboardScreen.kt` (Core Experience)
- **Collapsible Top Deck**:
  - **`CosmicSummaryCard`**: 20 astrological metric chips in a 2-column grid (Lagna, Moon, Dasha, Panchanga, Doshas).
  - **`KundaliChartCanvas`**: Centered 300dp North-Indian diamond chart.
  - **`VargaSelectorBar`**: Horizontal scrollable pills: `[D1] [D9] [D10] [D4] [D7] [D30] [Chandra] [Surya] [Gochar]`.
- **Sticky Tab Navigation**:
  - Pinned bar underneath the Kundali chart listing tabs 1 to 11.
  - Displays green dot for completed chapters and pulsing dot for streaming chapters.
- **Reading Prose Card**:
  - Renders markdown formatting: headers with bottom gold hairline, key-value highlights in ochre, blockquotes with gold borders, and bullet lists with `✦`.
  - **Tab 8 Special**: Automatically switches to **3 vertical Tripath Remedy Cards** (Vedic Shanti, Lal Kitab, Numerology).
  - **Classical Facts Card**: Shown immediately when loading or offline so the screen is never blank.

### 6.3 `ChatScreen.kt` (Ask AI Jyotishi)
- **Header**: Native avatar, chart name, and back button.
- **Chat Turn List**: `LazyColumn` with user messages (right-aligned, indigo container) and AI Jyotishi replies (left-aligned, parchment container).
- **Stream State**: Shows typing indicator `▉` and streams tokens in real-time.
- **Persistence**: Re-loads previous turns on mount via `GET /chat/history/{chart_id}`.

### 6.4 `ProfileScreen.kt` (Saved Charts Vault)
- Lists all saved profiles associated with the logged-in user.
- Allows switching charts with a single tap, editing parameters, or deleting charts.

---

## 7. 🔌 API Integration Contracts (Hugging Face Backend)

Use your deployed production endpoint:
```kotlin
object ApiConstants {
    const val BASE_URL = "https://brocoai-trikal-darshi-api.hf.space/"
}
```

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/google` | Verify Google ID Token from Credential Manager |
| `POST` | `/auth/login` | Email & password login |
| `POST` | `/chart/generate` | Generate chart from birth details |
| `GET` | `/chart/{chart_id}` | Fetch full chart JSON (planets, vargas, dasha) |
| `GET` | `/chart` | Fetch user's saved chart profiles (requires JWT) |
| `POST` | `/interpret/{chart_id}/{tab_number}` | Stream chapter interpretation (1–11) |
| `GET` | `/interpret/{chart_id}` | Fetch all pre-generated chapter interpretations |
| `GET` | `/progress/{chart_id}` | Poll background pre-generation status |
| `POST` | `/chat` | Stream AI chat interaction |
| `GET` | `/chat/history/{chart_id}` | Fetch historical chat messages |

---

## 8. 🚀 Instructions for the Coding Agent

When implementing the Android app with an agent:
1. **Initialize Project**: Use the official Android Studio Giraffe/Koala template with Compose and Hilt enabled.
2. **Apply Theme First**: Copy `Color.kt` and `Type.kt` from Section 3 before building any screens.
3. **Build the Kundali Canvas**: Ensure `KundaliChartCanvas.kt` accurately maps houses 1–12 and respects planet dignities (`Exalted`, `Debilitated`, `Retrograde`).
4. **Implement Streaming**: Ensure the OkHttp streaming client properly reads bytes incrementally without buffering the entire response.
5. **Add Offline Support**: Verify that Room caches both `ChartEntity` and `InterpretationEntity` so the app works without an internet connection after the initial generation.
