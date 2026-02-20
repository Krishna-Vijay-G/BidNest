import os
import shutil

def merge_text_files_recursive(source_dir, output_file_path):
    """
    Recursively finds all files in source_dir and merges their text 
    content into a single output_file_path.
    """
    # Open the output file in binary write mode for efficiency
    with open(output_file_path, 'wb') as outfile:
        # Walk through all directories and files in the source directory
        for root, dirs, files in os.walk(source_dir):
            for filename in files:
                # Ensure we only process text files if needed, or all files
                # You may add a check here for file extensions (e.g., if filename.endswith('.txt'))
                
                # Construct the full file path
                file_path = os.path.join(root, filename)
                
                # Skip the output file if it's in the source directory to avoid an infinite loop
                if os.path.abspath(file_path) == os.path.abspath(output_file_path):
                    continue

                # Open the current file in binary read mode and copy its contents
                try:
                    with open(file_path, 'rb') as infile:
                        shutil.copyfileobj(infile, outfile)
                        # Optional: Add a separator (e.g., newline) between files
                        outfile.write(b'\n========================================\n')
                except IOError as e:
                    print(f"Error processing file {file_path}: {e}")

# --- Example Usage ---
# Specify your source directory and desired output file path
SOURCE_DIRECTORY = "./src" 
OUTPUT_FILE = "./fullcodes.txt"

# Run the function
merge_text_files_recursive(SOURCE_DIRECTORY, OUTPUT_FILE)
print(f"All files in '{SOURCE_DIRECTORY}' and subdirectories have been merged into '{OUTPUT_FILE}'.")
