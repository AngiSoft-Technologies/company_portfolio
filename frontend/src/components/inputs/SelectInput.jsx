const SelectInputField = ({ 
    label, 
    name, 
    theme, 
    value, 
    selectedValue, 
    onChange, 
    options,
    disabled = false, // Default value is false
    multiple = false // Default value is false
  }) => {
    return (
      <div className="flex flex-col">
        <label className={`font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
          {label}
        </label>
        <select
          name={name}
          value={multiple ? (value) : value  || selectedValue || ""}
          onChange={onChange}
          disabled={disabled} // Apply the disabled prop
          className={`border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 
            ${theme === "dark" ? "bg-gray-800 text-white border-gray-700" : "bg-white text-black border-gray-300"}
          `}
          multiple={multiple}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };
  
  export default SelectInputField;