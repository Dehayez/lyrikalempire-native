import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const fetchGenres = async () => {
    try {
      const genresData = await getGenres();
      setGenres(genresData);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const fetchMoods = async () => {
    try {
      const moodsData = await getMoods();
      setMoods(moodsData);
    } catch (error) {
      console.error('Error fetching moods:', error);
    }
  };

  const fetchKeywords = async () => {
    try {
      const keywordsData = await getKeywords();
      setKeywords(keywordsData);
    } catch (error) {
      console.error('Error fetching keywords:', error);
    }
  };

  const fetchFeatures = async () => {
    try {
      const featuresData = await getFeatures();
      setFeatures(featuresData);
    } catch (error) {
      console.error('Error fetching features:', error);
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
    } catch (error) {
      console.error('Error refetching all data:', error);
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