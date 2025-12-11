plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val keystorePassword by project
val keyAlias by project
val keyPassword by project

android {
    namespace = "com.eyediatech.eyedeeaphotos"
    compileSdk = 34

    signingConfigs {
        create("release") {
            storeFile = file("D:/Work/Eyedeea-Core/android/eyedeea_photos")
            storePassword = keystorePassword as String
            keyAlias = keyAlias as String
            keyPassword = keyPassword as String
        }
    }

    flavorDimensions += "platform"

    productFlavors {
        create("firetv") {
            dimension = "platform"
            // No downloads for Fire TV
            buildConfigField("boolean", "ENABLE_DOWNLOADS", "false")
        }
        create("mobile") {
            dimension = "platform"
            // Enable downloads for mobile
            buildConfigField("boolean", "ENABLE_DOWNLOADS", "true")
            applicationIdSuffix = ".mobile"
        }
    }

    sourceSets {
        getByName("main") { 
            java.srcDirs("src/main/java")
        }
        getByName("firetv") {
            java.srcDirs("src/firetv/java")
            res.srcDirs("src/firetv/res")
            manifest.srcFile("src/firetv/AndroidManifest.xml")
        }
        getByName("mobile") {
            java.srcDirs("src/mobile/java")
            res.srcDirs("src/mobile/res")
        }
    }

    defaultConfig {
        applicationId = "com.eyediatech.eyedeeaphotos"
        minSdk = 21
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        vectorDrawables.useSupportLibrary = true
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
        getByName("debug") {
            isDebuggable = true
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += setOf(
                "META-INF/DEPENDENCIES",
                "META-INF/LICENSE",
                "META-INF/LICENSE.txt",
                "META-INF/NOTICE",
                "META-INF/NOTICE.txt",
                "META-INF/INDEX.LIST"
            )
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.10.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.webkit:webkit:1.9.0")
    implementation("androidx.leanback:leanback:1.2.0-alpha04")

    // Optional: Add these if you need them
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.7.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}

tasks.register("buildAndCopyApks") {
    group = "Build"
    description = "Builds and copies release APKs for all platforms."
    dependsOn(tasks.named("assembleFiretvRelease"), tasks.named("assembleMobileRelease"))

    doLast {
        val destinationDir = rootProject.file("../../release")
        destinationDir.mkdirs()

        // Copy FireTV APK
        copy {
            from(file("build/outputs/apk/firetv/release")) {
                include("*.apk")
            }
            into(destinationDir)
            rename { "ep_f.apk" }
        }

        // Copy Mobile APK
        copy {
            from(file("build/outputs/apk/mobile/release")) {
                include("*.apk")
            }
            into(destinationDir)
            rename { "ep_a.apk" }
        }
    }
}
