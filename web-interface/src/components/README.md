# Components Directory Structure

This directory contains all React components organized by their purpose and functionality.

## Folder Structure

```
components/
├── features/           # Feature-specific components
│   ├── VideoDiscoveryPanel.tsx
│   └── ProcessingStatus.tsx
├── forms/              # Form and configuration components
│   └── ProcessingStepsConfig.tsx
├── ui/                 # Reusable UI components
│   ├── ErrorBoundary.tsx
│   └── LoadingSpinner.tsx
├── MultiPlatformManager.tsx    # Main platform management
├── ProcessingConfiguration.tsx # Processing configuration
├── SchedulePreviewCalendar.tsx # Schedule preview
├── YouTubeChannelManager.tsx   # YouTube channel management
├── SchedulingConfiguration.tsx # Scheduling configuration
├── PlatformSelector.tsx        # Platform selection
└── index.ts            # Barrel exports

```

## Component Categories

### Feature Components (`features/`)
Components that implement specific application features:
- **VideoDiscoveryPanel**: Handles video file discovery and display
- **ProcessingStatus**: Real-time processing status and progress tracking

### Form Components (`forms/`)
Components that handle user input and configuration:
- **ProcessingStepsConfig**: Configuration for processing pipeline steps

### UI Components (`ui/`)
Reusable, generic UI components:
- **ErrorBoundary**: Error handling and display
- **LoadingSpinner**: Loading states and spinners

### Main Components (root level)
Large, complex components that manage major application features:
- **MultiPlatformManager**: Multi-platform posting configuration
- **ProcessingConfiguration**: Main processing configuration
- **SchedulePreviewCalendar**: Schedule preview and calendar
- **YouTubeChannelManager**: YouTube channel management
- **SchedulingConfiguration**: Scheduling options
- **PlatformSelector**: Platform selection interface

## Usage

Import components using the barrel export:

```typescript
import { 
  VideoDiscoveryPanel, 
  ProcessingStatus, 
  LoadingSpinner,
  ErrorBoundary 
} from '../components';
```

## Guidelines

1. **Feature Components**: Should be specific to a particular feature and contain business logic
2. **Form Components**: Should handle user input validation and state management
3. **UI Components**: Should be generic, reusable, and contain minimal business logic
4. **Main Components**: Can be complex but should be well-documented and tested

## Adding New Components

When adding new components:
1. Choose the appropriate folder based on the component's purpose
2. Follow the existing naming conventions
3. Add the export to `index.ts`
4. Include proper TypeScript interfaces
5. Add JSDoc comments for complex components 