import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getGenres, getMoods, getFeatures, getKeywords } from '../services';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [genres, setGenres] = useState([]);
  const [moods, setMoods] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [features, setFeatures] = useState([]);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const fetchGenres = async () => {
    try {
      const genresData = await getGenres();
      setGenres(genresData);
      return true;
    } catch (error) {
      console.error('Error fetching genres:', error);
      return false;
    }
  };

  const fetchMoods = async () => {
    try {
      const moodsData = await getMoods();
      setMoods(moodsData);
      return true;
    } catch (error) {
      console.error('Error fetching moods:', error);
      return false;
    }
  };

  const fetchKeywords = async () => {
    try {
      const keywordsData = await getKeywords();
      setKeywords(keywordsData);
      return true;
    } catch (error) {
      console.error('Error fetching keywords:', error);
      return false;
    }
  };

  const fetchFeatures = async () => {
    try {
      const featuresData = await getFeatures();
      setFeatures(featuresData);
      return true;
    } catch (error) {
      console.error('Error fetching features:', error);
      return false;
    }
  };

  const refetchAll = async () => {
    try {
      const [
        genresData,
        moodsData,
        keywordsData,
        featuresData
      ] = await Promise.all([
        getGenres(),
        getMoods(),
        getKeywords(),
        getFeatures()
      ]);
      setGenres(genresData);
      setMoods(moodsData);
      setKeywords(keywordsData);
      setFeatures(featuresData);
      retryCount.current = 0; // Reset retry counter on success
    } catch (error) {
      // Retry logic with exponential backoff
      if (retryCount.current < maxRetries) {
        const delay = Math.pow(2, retryCount.current) * 1000; // Exponential backoff: 1s, 2s, 4s
        retryCount.current++;
        setTimeout(refetchAll, delay);
      }
    }
  };

  useEffect(() => {
    refetchAll();
  }, []);

  return (
    <DataContext.Provider
      value={{
        genres,
        moods,
        keywords,
        features,
        fetchGenres,
        fetchMoods,
        fetchKeywords,
        fetchFeatures,
        refetchAll,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};