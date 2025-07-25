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
} from '@heroicons/react/outline';
import ConfirmationModal from "../features/confirmationModal"

function Sidebar({ onCollectionSelect }) {
  const [databases, setDatabases] = useState([]);
  const [expandedDb, setExpandedDb] = useState(null);
  const [activeItem, setActiveItem] = useState({ type: null, name: null });
  const [collections, setCollections] = useState({}); // Store collections for each database
  const [loading, setLoading] = useState(false);
  const [connectionString] = useState("mongodb://localhost:27017"); // You might want to make this configurable

  useEffect(() => {
    fetchDatabases();
  }, []);

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

  // --- Modal state management ---
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
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
    alert(`Copying collection "${collName}" from "${dbName}".`);
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

  const handleBackupDatabase = (dbName) => {
    alert(`Starting backup for database: ${dbName}`);
    // TODO: Implement backup functionality
  };
  
  const handleRestoreDatabase = (dbName) => {
    alert(`Restoring database: ${dbName}`);
    // TODO: Implement restore functionality
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

  if (loading) {
    return (
      <div className="flex flex-col h-screen w-72 bg-gray-800 text-gray-200">
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-700">
          <CubeTransparentIcon className="h-8 w-8 text-blue-400 mr-2" />
          <h1 className="text-xl font-bold text-white">Mongo Explorer</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
            <div className="text-gray-400 text-sm">Loading databases...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen w-72 bg-gray-800 text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          <div className="flex items-center">
            <CubeTransparentIcon className="h-8 w-8 text-blue-400 mr-2" />
            <h1 className="text-xl font-bold text-white">Mongo Explorer</h1>
          </div>
          <button 
            onClick={refreshDatabases}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            title="Refresh databases"
          >
            <RefreshIcon className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Connection Status */}
        <div className="px-4 py-2 bg-gray-900 text-xs">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span className="text-gray-400">Connected to: </span>
            <span className="text-gray-300 ml-1">localhost:27017</span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          {databases.length === 0 ? (
            <div className="text-gray-400 text-center py-4 text-sm">
              No databases found
            </div>
          ) : (
            databases.map((db) => (
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
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleBackupDatabase(db.name); }} 
                      title="Backup Database" 
                      className="p-1 rounded-full hover:bg-gray-600 transition-colors"
                    >
                      <ArchiveIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRestoreDatabase(db.name); }} 
                      title="Restore Database" 
                      className="p-1 rounded-full hover:bg-gray-600 transition-colors"
                    >
                      <UploadIcon className="h-4 w-4" />
                    </button>
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
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-700">
          <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
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
    </>
  );
}

export default Sidebar;