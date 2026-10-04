import { Platform } from 'react-native';
import {
    PASSCODE_DIFFERENT_ERROR,
    PASSCODE_FORMAT_ERROR,
    PASSCODE_MISMATCH_ERROR,
    canSubmitPasscodeChange,
    getConfirmPasscodeError,
    getNewPasscodeError,
    getPasscodeFormatError,
    isFourDigitPasscode,
    normalizePasscodeInput,
} from './passcodeValidation';

type PlatformOS = 'android' | 'ios' | 'web';

const PLATFORMS: PlatformOS[] = ['android', 'ios', 'web'];

let mockOS: PlatformOS = 'ios';

jest.mock('react-native', () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

describe.each(PLATFORMS)('passcode validation on %s', (platform) => {
    beforeEach(() => {
        mockOS = platform;
    });

    it('runs against the mocked platform', () => {
        expect(Platform.OS).toBe(platform);
    });

    it('normalizes to digits only and caps at four characters', () => {
        expect(normalizePasscodeInput('12ab3-45')).toBe('1234');
        expect(normalizePasscodeInput(' 9 8 7 6 5 ')).toBe('9876');
        expect(normalizePasscodeInput('')).toBe('');
    });

    it('accepts only four digits', () => {
        expect(isFourDigitPasscode('1234')).toBe(true);
        expect(isFourDigitPasscode(' 1234 ')).toBe(true);
        expect(isFourDigitPasscode('123')).toBe(false);
        expect(isFourDigitPasscode('12345')).toBe(false);
        expect(isFourDigitPasscode('12a4')).toBe(false);
    });

    it('reports the exact format error for incomplete or invalid input', () => {
        expect(getPasscodeFormatError('')).toBeNull();
        expect(getPasscodeFormatError('12')).toBe(PASSCODE_FORMAT_ERROR);
        expect(getPasscodeFormatError('12a4')).toBe(PASSCODE_FORMAT_ERROR);
        expect(getPasscodeFormatError('1234')).toBeNull();
    });

    it('requires the new passcode to differ from the current when current exists', () => {
        expect(getNewPasscodeError('', '1234')).toBeNull();
        expect(getNewPasscodeError('12', '1234')).toBe(PASSCODE_FORMAT_ERROR);
        expect(getNewPasscodeError('1234', '1234')).toBe(PASSCODE_DIFFERENT_ERROR);
        expect(getNewPasscodeError('5678', '1234')).toBeNull();
        expect(getNewPasscodeError('1234', null)).toBeNull();
    });

    it('requires confirm to match a complete new passcode', () => {
        expect(getConfirmPasscodeError('1234', '')).toBeNull();
        expect(getConfirmPasscodeError('1234', '12')).toBe(PASSCODE_FORMAT_ERROR);
        expect(getConfirmPasscodeError('1234', '5678')).toBe(PASSCODE_MISMATCH_ERROR);
        expect(getConfirmPasscodeError('1234', '1234')).toBeNull();
        expect(getConfirmPasscodeError('12', '1234')).toBeNull();
    });

    it('guards submit with complete, matching, different values', () => {
        expect(canSubmitPasscodeChange('1234', '1234', '0000')).toBe(true);
        expect(canSubmitPasscodeChange('1234', '1234', '1234')).toBe(false);
        expect(canSubmitPasscodeChange('1234', '1234', null)).toBe(true);
        expect(canSubmitPasscodeChange('1234', '5678', '0000')).toBe(false);
        expect(canSubmitPasscodeChange('123', '123', '0000')).toBe(false);
    });
});
