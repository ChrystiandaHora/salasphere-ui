module.exports = [
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                // Browser globals
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                fetch: "readonly",
                Headers: "readonly",
                setTimeout: "readonly",
                console: "readonly",
                Intl: "readonly",
                // App globals
                API_BASE: "readonly",
                saveSession: "readonly",
                getSession: "readonly",
                clearSession: "readonly",
                guardRoute: "readonly",
                getCurrentUser: "readonly",
                isAdmin: "readonly",
                userInitials: "readonly",
                showAlert: "readonly",
                applyFontScale: "readonly",
                switchTab: "readonly",
                setupPasswordToggle: "readonly",
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            eqeqeq: "error",
            semi: ["error", "always"],
        },
    },
];
