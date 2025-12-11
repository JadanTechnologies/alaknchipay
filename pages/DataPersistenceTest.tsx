import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';

export const DataPersistenceTest = () => {
    const { addBranch, addUser, addProduct, branches, users, products, customers, addCustomer } = useStore();
    const [testResults, setTestResults] = useState<string[]>([]);

    const addLog = (message: string) => {
        setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
        console.log(message);
    };

    const testBranchCreation = async () => {
        addLog('🧪 Testing Branch Creation...');
        try {
            await addBranch({
                name: 'Test Branch ' + Date.now(),
                address: '123 Test St',
                phone: '+1234567890'
            });
            addLog('✅ Branch creation function called');
        } catch (error) {
            addLog(`❌ Branch creation error: ${error}`);
        }
    };

    const testUserCreation = async () => {
        addLog('🧪 Testing User Creation...');
        try {
            await addUser({
                name: 'Test User',
                username: `testuser${Date.now()}@test.com`,
                password: 'Test123!',
                role: 'CASHIER',
                active: true,
                storeId: branches[0]?.id || null,
                expenseLimit: 0
            });
            addLog('✅ User creation function called');
        } catch (error) {
            addLog(`❌ User creation error: ${error}`);
        }
    };

    const testProductCreation = async () => {
        addLog('🧪 Testing Product Creation...');
        try {
            await addProduct({
                name: 'Test Product',
                sku: `TEST${Date.now()}`,
                category: 'General',
                costPrice: 100,
                sellingPrice: 150,
                stock: 10,
                minStockAlert: 5,
                storeId: branches[0]?.id || null
            });
            addLog('✅ Product creation function called');
        } catch (error) {
            addLog(`❌ Product creation error: ${error}`);
        }
    };

    return (
        <div className="p-8 bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-6">Data Persistence Test</h1>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-white font-bold mb-2">Branches</h3>
                        <p className="text-2xl text-blue-400">{branches.length}</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-white font-bold mb-2">Users</h3>
                        <p className="text-2xl text-green-400">{users.length}</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-white font-bold mb-2">Products</h3>
                        <p className="text-2xl text-purple-400">{products.length}</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-white font-bold mb-2">Customers</h3>
                        <p className="text-2xl text-indigo-400">{customers.length}</p>
                    </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">Run Tests</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={testBranchCreation}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold"
                        >
                            Test Branch Creation
                        </button>
                        <button
                            onClick={testUserCreation}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold"
                        >
                            Test User Creation
                        </button>
                        <button
                            onClick={testProductCreation}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold"
                        >
                            Test Product Creation
                        </button>
                        <button
                            onClick={async () => {
                                addLog('🧪 Testing Customer Creation...');
                                try {
                                    await addCustomer({ name: `Test Customer ${Date.now()}`, phone: '+10000000001' });
                                    addLog('✅ Customer creation function called');
                                } catch (error) {
                                    addLog(`❌ Customer creation error: ${error}`);
                                }
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold"
                        >
                            Test Customer Creation
                        </button>
                        <button
                            onClick={() => setTestResults([])}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
                        >
                            Clear Log
                        </button>
                    </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-4">Test Log</h2>
                    <div className="bg-black p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                        {testResults.length === 0 ? (
                            <p className="text-gray-500">No tests run yet. Click a button above to start testing.</p>
                        ) : (
                            testResults.map((result, idx) => (
                                <div key={idx} className="text-gray-300 mb-1">{result}</div>
                            ))
                        )}
                    </div>
                </div>

                <div className="mt-6 bg-yellow-900/30 border border-yellow-700 p-4 rounded-lg">
                    <h3 className="text-yellow-400 font-bold mb-2">📝 Instructions:</h3>
                    <ol className="text-yellow-200 text-sm space-y-1 list-decimal list-inside">
                        <li>Open browser console (F12) to see detailed logs</li>
                        <li>Click a test button above</li>
                        <li>Watch for toast notifications (top-right)</li>
                        <li>Check if count increases after test</li>
                        <li>Refresh page to verify data persists</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default DataPersistenceTest;
