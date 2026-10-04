import { Platform } from 'react-native';
import {
    EMAIL_REQUIRED_ERROR,
    INVALID_EMAIL_ERROR,
    INVALID_PIN_ERROR,
    isValidEmail,
    validateRegisterInput,
} from './registerValidation';

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

describe.each(PLATFORMS)('register validation on %s', (platform) => {
    beforeEach(() => {
        mockOS = platform;
    });

    it('ACC: runs against the mocked platform', () => {
        expect(Platform.OS).toBe(platform);
    });

    // ACC-06
    it('accepts well-formed email addresses', () => {
        expect(isValidEmail('a@b.co')).toBe(true);
        expect(isValidEmail('first.last+tag@example.com')).toBe(true);
        expect(isValidEmail('x@y-z.io')).toBe(true);
        expect(isValidEmail(' a@b.co ')).toBe(true);
        expect(isValidEmail('rclucban@gmail.com')).toBe(true);
        expect(isValidEmail('rclucban@yahoo.com')).toBe(true);
        expect(isValidEmail('user@domain.org')).toBe(true);
        expect(isValidEmail('first.last@sub.domain.ph')).toBe(true);
    });

    // ACC-06
    it('rejects malformed email addresses', () => {
        expect(isValidEmail('')).toBe(false);
        expect(isValidEmail('   ')).toBe(false);
        expect(isValidEmail('john')).toBe(false);
        expect(isValidEmail('john@')).toBe(false);
        expect(isValidEmail('@b.co')).toBe(false);
        expect(isValidEmail('a b@c.co')).toBe(false);
        expect(isValidEmail('a@b')).toBe(false);
        expect(isValidEmail('a@@b.co')).toBe(false);
        expect(isValidEmail('rclucban@')).toBe(false);
        expect(isValidEmail('rclucban@gmail')).toBe(false);
        expect(isValidEmail('@b.com')).toBe(false);
        expect(isValidEmail('a@b..com')).toBe(false);
        expect(isValidEmail('a@b.c')).toBe(false);
    });

    // ACC-07
    it('has no mode parameter, so both account modes share one result', () => {
        expect(validateRegisterInput.length).toBe(2);
    });

    // ACC-07
    it('reports a required email for empty or whitespace-only input', () => {
        expect(validateRegisterInput('', '1234')).toEqual({ ok: false, emailError: EMAIL_REQUIRED_ERROR });
        expect(validateRegisterInput('  ', '1234')).toEqual({ ok: false, emailError: EMAIL_REQUIRED_ERROR });
    });

    // ACC-08
    it('reports an invalid email for a non-email identifier in every mode', () => {
        expect(validateRegisterInput('john', '1234')).toEqual({
            ok: false,
            emailError: INVALID_EMAIL_ERROR,
        });
    });

    // ACC-09
    it('passes a valid email with a 4-digit pin', () => {
        const result = validateRegisterInput('a@b.co', '1234');

        expect(result.ok).toBe(true);
        expect(result.emailError).toBeUndefined();
        expect(result.pinError).toBeUndefined();
    });

    // ACC-10
    it('reports an invalid pin without touching the email error', () => {
        for (const pin of ['1', '123', '12345', '12a4', '']) {
            expect(validateRegisterInput('a@b.co', pin)).toEqual({
                ok: false,
                pinError: INVALID_PIN_ERROR,
            });
        }
    });

    // ACC-10
    it('gives the email error precedence when both fields are invalid', () => {
        const result = validateRegisterInput('john', '12');

        expect(result.ok).toBe(false);
        expect(result.emailError).toBe(INVALID_EMAIL_ERROR);
        expect(result.pinError).toBeUndefined();
    });
});
