import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeLocalStorage } from '../services/localStorage';

interface AuthSession {
    userId: string;
    username: string;
    role: string;
}

interface AuthContextType {
    session: AuthSession | null;
    user: AuthSession | null;
    signOut: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [user, setUser] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initialize localStorage with default data
        initializeLocalStorage();

        // Restore session if user previously logged in (after manual login)
        const savedSession = localStorage.getItem('alkanchipay_session');
        if (savedSession) {
            try {
                const sessionData = JSON.parse(savedSession);
                setSession(sessionData);
                setUser(sessionData);
            } catch (e) {
                console.error('Error parsing session', e);
            }
        }
        setLoading(false);
    }, []);

    const signOut = () => {
        localStorage.removeItem('alkanchipay_session');
        setSession(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, signOut, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
