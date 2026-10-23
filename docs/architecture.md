# Project Architecture Diagram

This diagram illustrates the modular structure and data flow of the CardHolder application.

```mermaid
graph TD
    subgraph UI_Layer [UI Layer - React Native / Expo]
        Home[Home Screen - Listing]
        AddEdit[Add/Edit Form]
        CardView[Card Detail View]
        CategoryChips[Category Chips]
        AppProvider[App Provider - Context]
    end

    subgraph Logic_Layer [Logic Layer - TypeScript]
        CardStore[Card Store - cardStore.ts]
        Analyze[Analysis Pipeline - analyze.ts]
        Classify[Classifier - classify.ts]
        Extract[Field Extractor - fields.ts]
        MRZ[MRZ Parser - mrz.ts]
        Gemma[Gemma Extraction - gemma.ts]
        SmartExtract[Smart Extraction - smartExtract.ts]
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
    Analyze -->|7. Call LLM| Gemma
    Gemma -->|8. Structured JSON| SmartExtract
    SmartExtract -->|9. Suggestions| AddEdit
    
    %% State and Storage
    AddEdit -->|10. Save Card| CardStore
    CardStore -->|11. Encrypt & Store| SQL
    CardStore -->|11. Encrypt & Store| BlobStore
    Home -->|Load Cards| CardStore
    CardStore -->|Read| SQL
    
    %% Other dependencies
    AppProvider --> CardStore
    AppProvider --> Settings
    Settings --> SQL
