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

        // Do NOT auto-login - require manual login
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
