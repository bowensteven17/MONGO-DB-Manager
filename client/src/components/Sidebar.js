// src/components/Sidebar.js - Complete navigation sidebar with copy modal
import { useState, useEffect } from 'react';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  CubeTransparentIcon,
  DatabaseIcon,
  DocumentTextIcon,
  DuplicateIcon,
  TrashIcon,
  ArchiveIcon,
  UploadIcon,
  RefreshIcon,
  CogIcon,
} from '@heroicons/react/outline';
import ConfirmationModal from "../features/confirmationModal";
import CopyCollectionModal from "./CopyCollectionModal";

function Sidebar({ onNavigationChange, onCollectionSelect }) {
  const [activeSection, setActiveSection] = useState('database');
  const [databases, setDatabases] = useState([]);
  const [expandedDb, setExpandedDb] = useState(null);
  const [activeItem, setActiveItem] = useState({ type: null, name: null });
  const [collections, setCollections] = useState({}); // Store collections for each database
  const [loading, setLoading] = useState(false);
  const [connectionString] = useState("mongodb://localhost:27017");

  useEffect(() => {
    if (activeSection === 'database') {
      fetchDatabases();
    }
  }, [activeSection]);

  const fetchDatabases = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/database/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connection_string: connectionString
        })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('API Response:', data);
      
      if (data.success && data.databases) {
        setDatabases(data.databases);
      } else {
        console.error('Unexpected API response structure:', data);
      }
    } catch (error) {
      console.error('Failed to fetch databases', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch collections for a specific database
  const fetchCollections = async (dbName) => {
    try {
      const res = await fetch('http://localhost:5000/api/collection/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connection_string: connectionString,
          database_name: dbName
        })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Collections Response:', data);
      
      if (data.success && data.collections) {
        setCollections(prev => ({
          ...prev,
          [dbName]: data.collections
        }));
      }
    } catch (error) {
      console.error('Failed to fetch collections for', dbName, error);
    }
  };

  // Navigation section handling
  const handleSectionChange = (section) => {
    setActiveSection(section);
    // Notify parent component about section change
    if (onNavigationChange) {
      onNavigationChange(section);
    }
  };

  // --- Modal state management ---
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // --- Copy Modal state management ---
  const [copyModalState, setCopyModalState] = useState({
    isOpen: false,
    sourceDatabase: '',
    sourceCollection: '',
  });

  const handleSelectDatabase = (db) => {
    setActiveItem({ type: 'database', name: db.name });
    console.log(`Selected Database: ${db.name}`);
  };
  
  const handleSelectCollection = (dbName, coll) => {
    setActiveItem({ type: 'collection', db: dbName, name: coll.name });
    console.log(`Selected Collection: ${coll.name} from ${dbName}`);
    
    // Call the parent callback if provided
    if (onCollectionSelect) {
      onCollectionSelect(dbName, coll.name);
    }
  };
  
  const handleCopyCollection = (dbName, collName) => {
    setCopyModalState({
      isOpen: true,
      sourceDatabase: dbName,
      sourceCollection: collName,
    });
  };

  const handleCopySuccess = async (targetDatabase, newCollectionName) => {
    console.log(`Successfully copied collection to ${targetDatabase}/${newCollectionName}`);
    
    // Refresh the target database collections
    await fetchCollections(targetDatabase);
    
    // Auto-expand the target database to show the new collection
    setExpandedDb(targetDatabase);
    
    // Close the copy modal
    setCopyModalState({
      isOpen: false,
      sourceDatabase: '',
      sourceCollection: '',
    });
  };

  const closeCopyModal = () => {
    setCopyModalState({
      isOpen: false,
      sourceDatabase: '',
      sourceCollection: '',
    });
  };

  const handleDropCollection = (dbName, collName) => {
    setModalState({
      isOpen: true,
      title: `Drop Collection: ${collName}`,
      message: `Are you sure you want to permanently drop the collection "${collName}" from the "${dbName}" database? This action cannot be undone.`,
      onConfirm: () => confirmDropCollection(dbName, collName),
    });
  };

  const confirmDropCollection = async (dbName, collName) => {
    try {
      const res = await fetch('http://localhost:5000/api/collection/drop', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connection_string: connectionString,
          database_name: dbName,
          collection_names: [collName],
          confirm: true
        })
      });
      
      if (res.ok) {
        // Refresh collections for this database
        await fetchCollections(dbName);
        console.log(`Successfully dropped collection: ${collName} from ${dbName}`);
      } else {
        const errorData = await res.json();
        console.error('Failed to drop collection:', errorData.message);
        alert(`Failed to drop collection: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error dropping collection:', error);
      alert(`Error dropping collection: ${error.message}`);
    }
    
    closeModal();
  };

  const closeModal = () => {
    setModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };

  const handleBackupDatabase = async (dbName) => {
    try {
      const res = await fetch('http://localhost:5000/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_string: connectionString,
          database_name: dbName,
        })
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Backup created: ${result.backup.name}`);
      } else {
        const error = await res.json();
        alert(`Backup failed: ${error.message}`);
      }
    } catch (error) {
      alert(`Backup failed: ${error.message}`);
    }
  };
  
  const handleRestoreDatabase = (dbName) => {
    alert(`Restoring database: ${dbName}`);
    // TODO: Implement restore functionality - should probably show restore modal
  };

  const toggleDb = async (dbName) => {
    if (expandedDb === dbName) {
      setExpandedDb(null);
    } else {
      setExpandedDb(dbName);
      // Fetch collections if we don't have them yet
      if (!collections[dbName]) {
        await fetchCollections(dbName);
      }
    }
  };

  const refreshDatabases = () => {
    fetchDatabases();
    setCollections({}); // Clear collections cache
    setExpandedDb(null);
  };

  // Render different content based on active section
  const renderDatabaseSection = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <span className="ml-2 text-sm text-gray-400">Loading...</span>
        </div>
      );
    }

    if (databases.length === 0) {
      return (
        <div className="p-4 text-center text-gray-400 text-sm">
          No databases found
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {databases.map((db) => (
          <div key={db.name}>
            {/* Database Item */}
            <div
              className={`group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                activeItem?.type === 'database' && activeItem?.name === db.name 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div className="flex items-center flex-1" onClick={() => handleSelectDatabase(db)}>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleDb(db.name); }} 
                  className="mr-2 p-1 rounded-full hover:bg-gray-600 transition-colors"
                >
                  {expandedDb === db.name ? 
                    <ChevronDownIcon className="h-4 w-4" /> : 
                    <ChevronRightIcon className="h-4 w-4" />
                  }
                </button>
                <DatabaseIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="truncate font-medium">{db.name}</span>
                  <span className="text-xs text-gray-400">
                    {db.collections} collections • {(db.sizeOnDisk / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              </div>
            </div>

            {/* Collections List */}
            {expandedDb === db.name && (
              <div className="pl-6 mt-1 space-y-1">
                {collections[db.name] ? (
                  collections[db.name].length === 0 ? (
                    <div className="text-gray-400 text-xs py-2 px-2">No collections found</div>
                  ) : (
                    collections[db.name].map((coll) => (
                      <div
                        key={coll.name}
                        className={`group flex items-center justify-between px-2 py-2 text-sm rounded-md cursor-pointer transition-colors ${
                          activeItem?.type === 'collection' && 
                          activeItem?.name === coll.name && 
                          activeItem?.db === db.name 
                            ? 'bg-blue-500 text-white' 
                            : 'hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center flex-1 min-w-0" onClick={() => handleSelectCollection(db.name, coll)}>
                          <DocumentTextIcon className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                          <div className="flex flex-col items-start min-w-0">
                            <span className="truncate text-sm">{coll.name}</span>
                            <span className="text-xs text-gray-400">
                              {new Intl.NumberFormat().format(coll.count)} docs • {coll.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleCopyCollection(db.name, coll.name); }} 
                            title="Copy Collection" 
                            className="p-1 rounded-full hover:bg-gray-600 transition-colors"
                          >
                            <DuplicateIcon className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDropCollection(db.name, coll.name); }} 
                            title="Drop Collection" 
                            className="p-1 rounded-full hover:bg-red-500 transition-colors"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div className="text-gray-400 text-xs py-2 px-2 flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400 mr-2"></div>
                    Loading collections...
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderBackupSection = () => {
    return (
      <div className="p-4 text-center text-gray-400">
        <ArchiveIcon className="h-12 w-12 mx-auto mb-2 text-gray-500" />
        <p className="text-sm">Backup Manager will be displayed in main area</p>
      </div>
    );
  };

  const renderSettingsSection = () => {
    return (
      <div className="p-4 space-y-3">
        <div className="border-b border-gray-700 pb-2">
          <h3 className="text-sm font-medium text-gray-300">Connection</h3>
          <p className="text-xs text-gray-500 mt-1">localhost:27017</p>
        </div>
        <div className="border-b border-gray-700 pb-2">
          <h3 className="text-sm font-medium text-gray-300">Backup Directory</h3>
          <p className="text-xs text-gray-500 mt-1">./backups</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-300">Options</h3>
          <div className="mt-2 space-y-1">
            <label className="flex items-center text-xs">
              <input type="checkbox" className="mr-2" defaultChecked />
              Auto-refresh collections
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" className="mr-2" />
              Compress backups
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-screen w-72 bg-gray-800 text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          <div className="flex items-center">
            <CubeTransparentIcon className="h-8 w-8 text-blue-400 mr-2" />
            <h1 className="text-xl font-bold text-white">Mongo Explorer</h1>
          </div>
          {activeSection === 'database' && (
            <button 
              onClick={refreshDatabases}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
              title="Refresh databases"
            >
              <RefreshIcon className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          )}
        </div>

        {/* Connection Status */}
        <div className="px-4 py-2 bg-gray-900 text-xs">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span className="text-gray-400">Connected to: </span>
            <span className="text-gray-300 ml-1">localhost:27017</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => handleSectionChange('database')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'database'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <DatabaseIcon className="h-4 w-4 inline mr-1" />
            Database
          </button>
          <button
            onClick={() => handleSectionChange('backup')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'backup'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <ArchiveIcon className="h-4 w-4 inline mr-1" />
            Backup
          </button>
          <button
            onClick={() => handleSectionChange('settings')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'settings'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <CogIcon className="h-4 w-4 inline mr-1" />
            Settings
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-2 py-4 overflow-y-auto">
          {activeSection === 'database' && renderDatabaseSection()}
          {activeSection === 'backup' && renderBackupSection()}
          {activeSection === 'settings' && renderSettingsSection()}
        </div>
      </div>
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
      >
        {modalState.message}
      </ConfirmationModal>

      {/* Copy Collection Modal */}
      <CopyCollectionModal
        isOpen={copyModalState.isOpen}
        onClose={closeCopyModal}
        sourceDatabase={copyModalState.sourceDatabase}
        sourceCollection={copyModalState.sourceCollection}
        connectionString={connectionString}
        allDatabases={databases}
        onCopySuccess={handleCopySuccess}
      />
    </>
  );
}

export default Sidebar;