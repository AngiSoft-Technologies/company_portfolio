const TextInputField = ({ label, type, placeholder, value, onChange, name, theme, pattern,minlength,maxlength,required, readonly,id }) => {
    return (
      <div className="mb-4">
        <label className={`block text-sm font-medium text-gray-700 ${
            theme === "dark" ? "text-white" : "text-black"
          }` }>{label}</label>
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          pattern={pattern}
          minLength={minlength}
          maxLength={maxlength}
          required={required}
          readOnly={readonly}
          id={id}
          onChange={onChange}
          className={`w-full p-3 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            theme === "dark" ? "bg-gray-800 text-white border-gray-700" : "bg-white text-black border-gray-300"
          }`}
        />
      </div>
    );
  };
  
  export default TextInputField;