# Project Architecture Diagram

This diagram illustrates the modular structure and data flow of the CardHolder application.

```mermaid
graph TD
    subgraph UI_Layer [UI Layer - React Native / Expo]
        Home[Home Screen - Listing]
        AddEdit[Add/Edit Form]
        CardView[Card Detail View]
        TagChips[Tag Chips]
        AppProvider[App Provider - Context]
    end

    subgraph Logic_Layer [Logic Layer - TypeScript]
        CardStore[Card Store - cardStore.ts]
        Analyze[Analysis Pipeline - analyze.ts]
        Classify[Classifier - classify.ts]
        Extract[Field Extractor - fields.ts]
        MRZ[MRZ Parser - mrz.ts]
        Recognizer[Text Recognizer - recognizer.ts]
    end

    subgraph Native_Module [Native Layer - Expo Module]
        CardOCR[Card OCR Module - modules/card-ocr]
        MLKit[Android ML Kit]
        Vision[iOS Vision]
        Paddle[PaddleOCR Arabic]
    end

    sub_graph Storage_Layer [Storage Layer]
        SQL[SQLite Database - sqlDb.ts]
        BlobStore[Encrypted Blob Store - blobStore.ts]
        Settings[Settings - settings.ts]
    end

    %% Data Flow
    AddEdit -->|1. Pick Image| Capture[Image Capture - capture.ts]
    Capture -->|2. Base64 Image| Recognizer
    Recognizer -->|3. Call Native| CardOCR
    CardOCR -->|4. Text Lines| Analyze
    Analyze -->|5. Run Rules| Classify
    Analyze -->|6. Parse MRZ| MRZ
    Analyze -->|7. Extract Fields| Extract
    Analyze -->|8. Suggestions| AddEdit
    
    %% State and Storage
    AddEdit -->|9. Save Card| CardStore
    CardStore -->|10. Encrypt & Store| SQL
    CardStore -->|10. Encrypt & Store| BlobStore
    Home -->|Load Cards| CardStore
    CardStore -->|Read| SQL
    
    %% Other dependencies
    AppProvider --> CardStore
    AppProvider --> Settings
    Settings --> SQL
