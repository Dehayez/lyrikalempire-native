import React, { useState, useRef, useEffect } from 'react';
import { IoChevronDownSharp } from "react-icons/io5";
import './Inputs.scss';
import './SelectInput.scss';

export const SelectInput = ({ id, name, placeholder, selectedValue, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState(selectedValue);
    const dropdownRef = useRef(null);

    // Sync internal state with prop changes
    useEffect(() => {
        setSelectedOption(selectedValue);
    }, [selectedValue]);

    const handleSelect = (option) => {
        setSelectedOption(option.value);
        onChange({ target: { name, value: option.value } });
        setIsOpen(false);
    };

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="form-group" ref={dropdownRef}>
            <div className="select-wrapper" onClick={() => setIsOpen(!isOpen)}>
                <div className="select-wrapper__selected" style={{ color: selectedOption ? 'white' : '#828282' }}>
                    {selectedOption ? options.find(option => option.value === selectedOption).label : placeholder}
                </div>
                <IoChevronDownSharp 
                    style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        right: '12px', 
                        transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`, 
                        transition: 'transform 0.2s ease-in-out' 
                    }} 
                />
                {isOpen && (
                    <div className="select-wrapper__options">
                        {options.map(option => (
                            <div
                                key={option.value}
                                className="select-wrapper__option"
                                onClick={() => handleSelect(option)}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};