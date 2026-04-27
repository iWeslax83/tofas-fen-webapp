export interface DemoStats {
  accessibilityScore: number;
  wcagCompliance: string;
  keyboardNavigation: boolean;
  screenReaderSupport: boolean;
  focusManagement: boolean;
  colorContrast: boolean;
  textScaling: boolean;
  motionReduction: boolean;
}

export interface FormData {
  name: string;
  email: string;
  password: string;
  message: string;
  category: string;
  priority: string;
}
