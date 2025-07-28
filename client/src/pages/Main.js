// src/main.js - Updated with navigation support
import { useState } from 'react';
import Sidebar from "../components/Sidebar";
import DatabaseCard from "../components/databaseCard";
import BackupManager from "../components/backup/BackupManager";
import Settings from "../components/Settings";

function Main() {
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [activeSection, setActiveSection] = useState('database');

    const handleCollectionSelect = (databaseName, collectionName) => {
        setSelectedCollection({ databaseName, collectionName });
    };

    const handleNavigationChange = (section) => {
        setActiveSection(section);
        // Clear collection selection when switching away from database section
        if (section !== 'database') {
            setSelectedCollection(null);
        }
    };

    const renderDatabaseContent = () => {
        if (selectedCollection) {
            return (
                <DatabaseCard 
                    databaseName={selectedCollection.databaseName}
                    collectionName={selectedCollection.collectionName}
                />
            );
        }

        // Default welcome screen for database section
        return (
            <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-center">
                    <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 1.79 4 4 4h8c0 2.21 1.79 4 4 4h8c0-2.21-1.79-4-4-4H8c-2.21 0-4-1.79-4-4V7M4 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16m0 0V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m-6 0V4a1 1 0 011-1h2a1 1 0 011 1v3M9 7h6"/>
                        </svg>
                    </div>
                    <h3 className="text-2xl font-medium text-gray-900 mb-2">Welcome to MongoDB Explorer</h3>
                    <p className="text-lg text-gray-500 max-w-md">
                        Select a collection from the sidebar to view its details and manage your MongoDB data.
                    </p>
                    <div className="mt-8 flex justify-center space-x-6">
                        <div className="flex items-center text-sm text-gray-600">
                            <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Browse databases and collections
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                            <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy and manage collections
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                            <svg className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
                            </svg>
                            Backup and restore
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'database':
                return renderDatabaseContent();
            
            case 'backup':
                return <BackupManager />;
            
            case 'settings':
                return <Settings />;
            
            default:
                return renderDatabaseContent();
        }
    };

    return (
        <div className="flex h-screen">
            <Sidebar 
                onCollectionSelect={handleCollectionSelect}
                onNavigationChange={handleNavigationChange}
                activeSection={activeSection}
            />
            <div className="flex-1 overflow-auto">
                {renderContent()}
            </div>
        </div>
    );
}

export default Main;