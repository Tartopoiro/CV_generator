import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import os
import json
import shutil
import subprocess

class JSONEditorApp(tk.Tk):
    def __init__(self, root_folders):
        super().__init__()
        self.title("Mini JSON Editor")
        self.geometry("1600x800")

        self.root_folders = [os.path.abspath(f) for f in root_folders]
        self.current_file = None
        self.loaded_folders = set()
        self.autocomplete_mapping = {}

        self.setup_ui()
        self.populate_trees()
        self.bind_shortcuts()

    # =====================================================
    # ================== UI SETUP =========================
    # =====================================================
    def setup_ui(self):
        self.paned = ttk.PanedWindow(self, orient=tk.HORIZONTAL)
        self.paned.pack(fill=tk.BOTH, expand=True)

        # === Left panel ===
        self.tree_frame = ttk.Frame(self.paned)
        self.tree_frame.pack(fill=tk.BOTH, expand=True)

        # Toolbar
        toolbar = ttk.Frame(self.tree_frame)
        toolbar.pack(fill=tk.X, pady=2)
        ttk.Button(toolbar, text="🡳", width=3, command=self.expand_all).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="🡱", width=3, command=self.collapse_all).pack(side=tk.LEFT, padx=2)
        self.search_var = tk.StringVar()
        self.search_entry = ttk.Entry(toolbar, textvariable=self.search_var)
        self.search_entry.pack(side=tk.LEFT, padx=5, fill=tk.X, expand=True)
        self.search_entry.bind("<KeyRelease>", self.update_autocomplete)
        self.search_entry.bind("<Down>", self.focus_autocomplete_entry)
        self.search_entry.bind("<Return>", self.open_selected_autocomplete_entry)

        # Trees
        self.atoms_tree_frame = ttk.LabelFrame(self.tree_frame, text="Atoms")
        self.atoms_tree_frame.pack(fill=tk.BOTH, expand=True, padx=2, pady=2)
        self.tree_atoms = ttk.Treeview(self.atoms_tree_frame)
        self.tree_atoms.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)
        scrollbar_atoms = ttk.Scrollbar(self.atoms_tree_frame, orient="vertical", command=self.tree_atoms.yview)
        scrollbar_atoms.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree_atoms.configure(yscrollcommand=scrollbar_atoms.set)

        self.builds_tree_frame = ttk.LabelFrame(self.tree_frame, text="Builds")
        self.builds_tree_frame.pack(fill=tk.BOTH, expand=True, padx=2, pady=2)
        self.tree_builds = ttk.Treeview(self.builds_tree_frame)
        self.tree_builds.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)
        scrollbar_builds = ttk.Scrollbar(self.builds_tree_frame, orient="vertical", command=self.tree_builds.yview)
        scrollbar_builds.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree_builds.configure(yscrollcommand=scrollbar_builds.set)

        self.paned.add(self.tree_frame, weight=1)

        # Form editor
        self.form_frame_container = ttk.Frame(self.paned)
        self.paned.add(self.form_frame_container, weight=3)
        self.current_form = None

        # Bottom bar
        bottom_frame = ttk.Frame(self)
        bottom_frame.pack(fill=tk.X)
        self.save_btn = ttk.Button(bottom_frame, text="Save (Ctrl+S)", command=self.save_file)
        self.save_btn.pack(side=tk.LEFT, padx=5, pady=5)
        self.save_as_btn = ttk.Button(bottom_frame, text="Save As (Ctrl+Shift+S)", command=self.save_as)
        self.save_as_btn.pack(side=tk.LEFT, padx=5, pady=5)
        self.delete_btn = ttk.Button(bottom_frame, text="Delete (Del)", command=self.delete_selected)
        self.delete_btn.pack(side=tk.LEFT, padx=5, pady=5)
        self.rename_btn = ttk.Button(bottom_frame, text="Rename (Ctrl+Shift+Q)", command=self.rename_selected)
        self.rename_btn.pack(side=tk.LEFT, padx=5, pady=5)
        self.status_label = ttk.Label(bottom_frame, text="No file opened", anchor="w")
        self.status_label.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=10)
        self.generate_btn = ttk.Button(bottom_frame, text="Generate", command=self.generate_builds)
        self.generate_btn.pack(side=tk.LEFT, padx=5, pady=5)


        # Tree events
        for tree in (self.tree_atoms, self.tree_builds):
            tree.bind("<<TreeviewOpen>>", self.on_open_folder)
            tree.bind("<Double-1>", self.on_open_file)
            tree.bind("<Button-3>", lambda e, t=tree: self.on_right_click(e, t))

    # =====================================================
    # ================= SHORTCUTS =========================
    # =====================================================
    def bind_shortcuts(self):
        self.bind("<Control-s>", lambda e: self.save_file())
        self.bind("<Control-S>", lambda e: self.save_as())
        self.bind("<Control-Shift-s>", lambda e: self.save_as())
        self.bind("<Delete>", lambda e: self.delete_selected())
        self.bind("<Control-e>", lambda e: self.expand_all())
        self.bind("<Control-r>", lambda e: self.collapse_all())
        self.bind("<Control-Shift-q>", lambda e: self.rename_selected())

    # =====================================================
    # ================= TREE HANDLING ====================
    # =====================================================

    def get_open_nodes(self, tree):
        open_paths = []
        def recurse(node):
            if tree.item(node, "open"):
                values = tree.item(node, "values")
                if values:
                    open_paths.append(values[0])  # chemin du dossier
                for child in tree.get_children(node):
                    recurse(child)
        for n in tree.get_children():
            recurse(n)
        return open_paths

    def restore_open_nodes(self, tree, open_paths):
        # Ouvre récursivement les parents
        def open_recursive(node):
            values = tree.item(node, "values")
            if not values:
                return
            path = values[0]
            children = tree.get_children(node)
            # Si dossier est ouvert dans open_paths
            if path in open_paths:
                tree.item(node, open=True)
                # Charger enfants si dummy
                if any(tree.item(c, "text") == "dummy" for c in children):
                    for c in children:
                        if tree.item(c, "text") == "dummy":
                            tree.delete(c)
                    self.load_children(tree, node, path)
            for c in tree.get_children(node):
                open_recursive(c)

        for n in tree.get_children():
            open_recursive(n)


    def populate_trees(self):
        for tree in (self.tree_atoms, self.tree_builds):
            tree.delete(*tree.get_children())
        for folder in self.root_folders:
            base = os.path.basename(folder)
            root_node = None
            if base == "atoms":
                root_node = self.tree_atoms.insert("", "end", text=base, values=[folder], tags=("folder",))
            elif base == "builds":
                root_node = self.tree_builds.insert("", "end", text=base, values=[folder], tags=("folder",))
            if root_node:
                self.tree_atoms.insert(root_node, "end", text="dummy") if base == "atoms" else self.tree_builds.insert(root_node, "end", text="dummy")
        for tree in (self.tree_atoms, self.tree_builds):
            tree.tag_configure("folder", foreground="blue")
            tree.tag_configure("json", foreground="darkgreen")

    def on_open_folder(self, event):
        tree = event.widget
        node = tree.focus()
        path_values = tree.item(node, "values")
        if not path_values or path_values[0] in self.loaded_folders:
            return
        for child in tree.get_children(node):
            if tree.item(child, "text") == "dummy":
                tree.delete(child)
        self.load_children(tree, node, path_values[0])
        self.loaded_folders.add(path_values[0])

    def load_children(self, tree, parent, path):
        try:
            for entry in sorted(os.listdir(path)):
                full_path = os.path.join(path, entry)
                if os.path.isdir(full_path):
                    node = tree.insert(parent, "end", text=entry, values=[full_path], tags=("folder",))
                    tree.insert(node, "end", text="dummy")
                elif entry.endswith(".json"):
                    tree.insert(parent, "end", text=entry, values=[full_path], tags=("json",))
        except PermissionError:
            pass

    def expand_all(self):
        for tree in (self.tree_atoms, self.tree_builds):
            for node in tree.get_children():
                self._expand_node_recursively(tree, node)

    def _expand_node_recursively(self, tree, node):
        tree.item(node, open=True)
        path_values = tree.item(node, "values")
        if path_values and os.path.isdir(path_values[0]):
            children = tree.get_children(node)
            if any(tree.item(c, "text") == "dummy" for c in children):
                for c in children:
                    if tree.item(c, "text") == "dummy":
                        tree.delete(c)
                self.load_children(tree, node, path_values[0])
        for child in tree.get_children(node):
            self._expand_node_recursively(tree, child)

    def collapse_all(self):
        for tree in (self.tree_atoms, self.tree_builds):
            for node in tree.get_children():
                self._collapse_node_recursively(tree, node)

    def _collapse_node_recursively(self, tree, node):
        tree.item(node, open=False)
        for child in tree.get_children(node):
            self._collapse_node_recursively(tree, child)

    # =====================================================
    # ================= FILE HANDLING ====================
    # =====================================================
    class JSONFormFrame(ttk.Frame):
        def __init__(self, master, data=None):
            super().__init__(master)
            self.data = data or {}
            self.entries = {}
            
            # Canvas with scrollbar
            canvas = tk.Canvas(self)
            scrollbar = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
            self.scrollable_frame = ttk.Frame(canvas)
            
            self.scrollable_frame.bind(
                "<Configure>",
                lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
            )
            
            canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
            canvas.configure(yscrollcommand=scrollbar.set)
            
            canvas.pack(side="left", fill="both", expand=True)
            scrollbar.pack(side="right", fill="y")
            
            self.build_form(self.data)

        def build_form(self, data, parent=None, prefix=""):
            parent = parent or self.scrollable_frame
            
            # Largeur fixe pour les labels
            label_width = 20
            
            for key, value in data.items():
                frame = ttk.Frame(parent)
                frame.pack(fill=tk.X, pady=2, padx=5)
                
                # Label avec largeur fixe, en gras et plus gros
                label = ttk.Label(frame, text=key, width=label_width, anchor="w", 
                                font=('TkDefaultFont', 10, 'bold'))
                label.pack(side=tk.LEFT, padx=(0, 10), anchor="n")

                if isinstance(value, list):
                    # Liste : Text widget multi-lignes
                    e = tk.Text(frame, height=5, width=100)
                    e.pack(side=tk.LEFT, fill=tk.X, expand=True)
                    e.insert("1.0", "\n".join(str(v) for v in value))
                    self.entries[prefix + key] = (e, True)

                elif value == "summary" or key == "summary":
                    # Champ spécial "summary" : Text widget plus grand
                    e = tk.Text(frame, height=10, width=80)
                    e.pack(side=tk.LEFT, fill=tk.X, expand=True)
                    e.insert("1.0", str(value))
                    self.entries[prefix + key] = (e, True)  # <- mettre True ici

                else:
                    # Champ simple
                    e = ttk.Entry(frame, width=80)
                    e.pack(side=tk.LEFT, fill=tk.X, expand=True)
                    e.insert(0, str(value))
                    self.entries[prefix + key] = (e, False)

        def get_data(self):
            result = {}
            for key, (widget, is_list) in self.entries.items():
                if isinstance(widget, tk.Text):
                    # Pour tous les Text widgets (liste ou summary)
                    text = widget.get("1.0", tk.END).strip()
                    if is_list:
                        result[key] = [line for line in text.splitlines() if line.strip()]
                    else:
                        result[key] = text
                else:
                    result[key] = widget.get()
            return result


    def on_open_file(self, event):
        tree = event.widget
        node = tree.focus()
        path_values = tree.item(node, "values")
        if not path_values: return
        path = path_values[0]
        if os.path.isfile(path) and path.endswith(".json"):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = json.load(f)
            except Exception as e:
                messagebox.showerror("Error", f"Unable to open file:\n{e}")
                return

            if self.current_form:
                self.current_form.destroy()

            self.current_form = self.JSONFormFrame(self.form_frame_container, data=content)
            self.current_form.pack(fill=tk.BOTH, expand=True)
            self.current_file = path
            self.status_label.config(text=f"Editing: {os.path.basename(path)}")

    def save_file(self):
        if not self.current_file or not self.current_form:
            messagebox.showwarning("No file", "No file is currently open.")
            return
        try:
            data = self.current_form.get_data()
            with open(self.current_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            messagebox.showinfo("Saved", f"Saved: {os.path.basename(self.current_file)}")
        except Exception as e:
            messagebox.showerror("Error", f"Unable to save file:\n{e}")

    def save_as(self):
        if not self.current_file or not self.current_form:
            messagebox.showwarning("No file", "No file is currently open.")
            return
        dir_name = os.path.dirname(self.current_file)
        base_name = os.path.basename(self.current_file)
        new_name = simpledialog.askstring(
            "Save As", "Enter new file name (without .json):", initialvalue=base_name.replace(".json", "")
        )
        if new_name:
            new_path = os.path.join(dir_name, f"{new_name}.json")
            try:
                data = self.current_form.get_data()
                with open(new_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                open_atoms = self.get_open_nodes(self.tree_atoms)
                open_builds = self.get_open_nodes(self.tree_builds)
                self.populate_trees()
                self.loaded_folders.clear()
                self.restore_open_nodes(self.tree_atoms, open_atoms)
                self.restore_open_nodes(self.tree_builds, open_builds)
                self.status_label.config(text=f"Editing: {os.path.basename(new_path)}")
                self.current_file = new_path
                messagebox.showinfo("Saved As", f"File saved as: {new_name}.json")
            except Exception as e:
                messagebox.showerror("Error", f"Unable to save:\n{e}")

    # =====================================================
    # ================= RENAME ===========================
    # =====================================================
    def rename_selected(self):
        node, tree = None, None
        for t in (self.tree_atoms, self.tree_builds):
            n = t.focus()
            if n:
                node = n
                tree = t
                break
        if not node:
            messagebox.showwarning("Rename", "No item selected.")
            return
        path = tree.item(node, "values")[0]
        base = os.path.basename(path)
        new_name = simpledialog.askstring("Rename", "Enter new name:", initialvalue=base)
        if not new_name or new_name == base:
            return
        new_path = os.path.join(os.path.dirname(path), new_name)
        if os.path.exists(new_path):
            messagebox.showerror("Error", "A file/folder with that name already exists.")
            return
        os.rename(path, new_path)
        tree.item(node, text=new_name, values=[new_path])
        if self.current_file == path:
            self.current_file = new_path
            self.status_label.config(text=f"Editing: {os.path.basename(new_path)}")

    # =====================================================
    # ================= DELETE FILE ======================
    # =====================================================
    def delete_selected(self):
        node, tree = None, None
        for t in (self.tree_atoms, self.tree_builds):
            n = t.focus()
            if n:
                node = n
                tree = t
                break
        if not node:
            messagebox.showwarning("Delete", "No item selected.")
            return
        path = tree.item(node, "values")[0]
        if os.path.isdir(path):
            messagebox.showerror("Delete", "Cannot delete folders.")
            return
        confirm = messagebox.askyesno("Delete", f"Delete '{os.path.basename(path)}'?")
        if not confirm:
            return
        try:
            os.remove(path)
            if self.current_file == path:
                if self.current_form:
                    self.current_form.destroy()
                self.current_file = None
            open_atoms = self.get_open_nodes(self.tree_atoms)
            open_builds = self.get_open_nodes(self.tree_builds)
            self.populate_trees()
            self.loaded_folders.clear()
            self.restore_open_nodes(self.tree_atoms, open_atoms)
            self.restore_open_nodes(self.tree_builds, open_builds)
            self.status_label.config(text="Deleted successfully.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to delete:\n{e}")

    # =====================================================
    # ================= RIGHT CLICK ======================
    # =====================================================
    def on_right_click(self, event, tree):
        node = tree.identify_row(event.y)
        if not node: return
        tree.selection_set(node)
        tree.focus(node)
        path = tree.item(node, "values")[0]
        menu = tk.Menu(self, tearoff=0)
        
        if os.path.isdir(path):
            if os.path.basename(path) == "builds":
                menu.add_command(label="New Build", command=self.create_new_build)
            # Vérifier si le dossier est dans atoms/
            elif "atoms" in path.split(os.sep):
                menu.add_command(label="New File", command=lambda: self.create_new_file_from_template(path))
        elif os.path.isfile(path):
            menu.add_command(label="Rename", command=self.rename_selected)
            menu.add_command(label="Delete", command=self.delete_selected)
        
        if menu.index("end") is not None:
            menu.post(event.x_root, event.y_root)

    # =====================================================
    # ============== NEW FILE FROM TEMPLATE ==============
    # =====================================================
    def create_new_file_from_template(self, folder_path):
        template_path = os.path.join(folder_path, "template.json")
        
        if not os.path.exists(template_path):
            messagebox.showerror("Error", f"No template.json found in {os.path.basename(folder_path)}")
            return
        
        # Demander le nom du fichier
        new_name = simpledialog.askstring("New File", "Enter file name (without .json):")
        if not new_name:
            return
        
        new_path = os.path.join(folder_path, f"{new_name}.json")
        
        if os.path.exists(new_path):
            messagebox.showerror("Error", "A file with that name already exists.")
            return
        
        try:
            # Copier le template
            shutil.copy2(template_path, new_path)
            
            # Recharger l'arbre
            open_atoms = self.get_open_nodes(self.tree_atoms)
            open_builds = self.get_open_nodes(self.tree_builds)
            self.populate_trees()
            self.loaded_folders.clear()
            self.restore_open_nodes(self.tree_atoms, open_atoms)
            self.restore_open_nodes(self.tree_builds, open_builds)
            
            # Ouvrir le nouveau fichier
            with open(new_path, "r", encoding="utf-8") as f:
                content = json.load(f)
            
            if self.current_form:
                self.current_form.destroy()
            
            self.current_form = self.JSONFormFrame(self.form_frame_container, data=content)
            self.current_form.pack(fill=tk.BOTH, expand=True)
            self.current_file = new_path
            self.status_label.config(text=f"Editing: {os.path.basename(new_path)}")
            
            messagebox.showinfo("Success", f"File created: {new_name}.json")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to create file:\n{e}")

    # =====================================================
    # ================= NEW BUILD ========================
    # =====================================================
    class FileSelectorDialog(tk.Toplevel):
        def __init__(self, master, folder, title="Select file", multiple=False):
            super().__init__(master)
            self.title(title)
            self.folder = folder
            self.multiple = multiple
            self.result = None
            self.selected_files = set()

            self.transient(master)
            self.grab_set()

            width, height = 500, 400
            self.geometry(f"{width}x{height}")
            self.center_window(width, height)

            # Search field
            self.search_var = tk.StringVar()
            self.search_var.trace_add("write", self.update_list)
            self.search_entry = ttk.Entry(self, textvariable=self.search_var)
            self.search_entry.pack(fill=tk.X, padx=5, pady=5)
            self.search_entry.focus()

            # Listbox
            self.listbox = tk.Listbox(self, selectmode=tk.MULTIPLE if multiple else tk.SINGLE)
            self.listbox.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
            scrollbar = ttk.Scrollbar(self.listbox, orient="vertical", command=self.listbox.yview)
            self.listbox.config(yscrollcommand=scrollbar.set)
            scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

            # Navigation clavier
            self.search_entry.bind("<Down>", lambda e: self.focus_list())
            self.listbox.bind("<Up>", self.on_arrow)
            self.listbox.bind("<Down>", self.on_arrow)
            self.listbox.bind("<Return>", self.select_current_item)
            self.listbox.bind("<Shift-Return>", lambda e: self.on_ok())

            # Buttons
            btn_frame = ttk.Frame(self)
            btn_frame.pack(fill=tk.X, pady=5)
            ttk.Button(btn_frame, text="OK", command=self.on_ok).pack(side=tk.RIGHT, padx=5)
            ttk.Button(btn_frame, text="Cancel", command=self.on_cancel).pack(side=tk.RIGHT, padx=5)

            # Load files
            self.all_files = [f for f in os.listdir(folder) if f.endswith(".json")]
            self.update_list()

        def center_window(self, w, h):
            self.update_idletasks()
            ws = self.winfo_screenwidth()
            hs = self.winfo_screenheight()
            x = (ws // 2) - (w // 2)
            y = (hs // 2) - (h // 2)
            self.geometry(f"{w}x{h}+{x}+{y}")

        def update_list(self, *args):
            search = self.search_var.get().lower()
            self.listbox.delete(0, tk.END)
            for f in self.all_files:
                if search in f.lower() or f in self.selected_files:
                    self.listbox.insert(tk.END, f)
                    if f in self.selected_files:
                        idx = self.listbox.get(0, tk.END).index(f)
                        self.listbox.selection_set(idx)

        def focus_list(self):
            if self.listbox.size() > 0:
                self.listbox.focus_set()
                first = 0
                self.listbox.selection_clear(0, tk.END)
                self.listbox.selection_set(first)
                self.listbox.activate(first)

        def on_arrow(self, event):
            size = self.listbox.size()
            if size == 0: return
            current = self.listbox.curselection()
            if current:
                idx = current[0]
            else:
                idx = 0
            if event.keysym == "Up":
                idx = max(0, idx - 1)
            elif event.keysym == "Down":
                idx = min(size - 1, idx + 1)
            self.listbox.selection_clear(0, tk.END)
            self.listbox.selection_set(idx)
            self.listbox.activate(idx)
            self.listbox.see(idx)

        def select_current_item(self, event=None):
            idx = self.listbox.curselection()
            if not idx: return
            fname = self.listbox.get(idx[0])
            
            if not self.multiple:
                # Mode single : on remplace la sélection
                self.selected_files = {fname}
            else:
                # Mode multiple : on toggle
                if fname in self.selected_files:
                    self.selected_files.remove(fname)
                else:
                    self.selected_files.add(fname)
            
            self.update_list()
            self.search_entry.focus_set()
            self.search_entry.icursor(tk.END)

        def on_ok(self):
            # Récupère la sélection courante si rien n'a été ajouté
            if not self.selected_files:
                if self.multiple:
                    self.selected_files = {self.listbox.get(i) for i in self.listbox.curselection()}
                else:
                    sel = self.listbox.curselection()
                    if sel:
                        self.selected_files = {self.listbox.get(sel[0])}

            if self.multiple:
                self.result = [os.path.join(self.folder, f) for f in self.selected_files]
            else:
                if not self.selected_files:
                    messagebox.showwarning("No selection", "Please select a file.")
                    return
                self.result = [os.path.join(self.folder, f) for f in self.selected_files]
            self.destroy()

        def on_cancel(self):
            self.result = None
            self.destroy()

    def create_new_build(self):
        atoms_base = os.path.abspath("atoms")

        def select(folder, prompt, multiple=False):
            dlg = self.FileSelectorDialog(self, folder, title=prompt, multiple=multiple)
            self.wait_window(dlg)
            return dlg.result

        header = select(os.path.join(atoms_base, "header"), "Choose header", multiple=False)
        if header is None: return
        if not header:
            messagebox.showwarning("Selection required", "Header is required")
            return
            
        title = select(os.path.join(atoms_base, "titles"), "Choose title", multiple=False)
        if title is None: return
        if not title:
            messagebox.showwarning("Selection required", "Title is required")
            return
            
        summary = select(os.path.join(atoms_base, "summaries"), "Choose summary", multiple=False)
        if summary is None: return
        if not summary:
            messagebox.showwarning("Selection required", "Summary is required")
            return
            
        education = select(os.path.join(atoms_base, "education"), "Choose education entries", multiple=True)
        if education is None: return
        
        experience = select(os.path.join(atoms_base, "experience"), "Choose experience entries", multiple=True)
        if experience is None: return
        
        skills = select(os.path.join(atoms_base, "skills"), "Choose skills entries", multiple=True)
        if skills is None: return

        def to_rel(paths):
            if isinstance(paths, list):
                return [os.path.relpath(p, start=os.getcwd()).replace(os.sep, "/") for p in paths]
            return os.path.relpath(paths, start=os.getcwd()).replace(os.sep, "/")

        build_data = {
            "header": to_rel(header[0]) if header else "",
            "title": to_rel(title[0]) if title else "",
            "summary": to_rel(summary[0]) if summary else "",
            "education": to_rel(education) if education else [],
            "experience": to_rel(experience) if experience else [],
            "skills": to_rel(skills) if skills else []
        }

        build_name = simpledialog.askstring("Build name", "Enter build name (without .json):")
        if not build_name: return
        build_dir = os.path.abspath("builds")
        os.makedirs(build_dir, exist_ok=True)
        build_path = os.path.join(build_dir, f"{build_name}.json")
        
        with open(build_path, "w", encoding="utf-8") as f:
            json.dump(build_data, f, indent=2)

        messagebox.showinfo("Build created", f"Build saved as {os.path.relpath(build_path).replace(os.sep,'/')}")
        open_atoms = self.get_open_nodes(self.tree_atoms)
        open_builds = self.get_open_nodes(self.tree_builds)
        self.populate_trees()
        self.loaded_folders.clear()
        self.restore_open_nodes(self.tree_atoms, open_atoms)
        self.restore_open_nodes(self.tree_builds, open_builds)

    # =====================================================
    # ================= AUTOCOMPLETE ======================
    # =====================================================
    def get_all_json_files(self):
        files = []
        for root in self.root_folders:
            for dirpath, _, filenames in os.walk(root):
                for f in filenames:
                    if f.endswith(".json"):
                        files.append(os.path.join(dirpath, f))
        return files

    def update_autocomplete(self, event=None):
        search_text = self.search_var.get().lower()
        if hasattr(self, 'autocomplete_window') and self.autocomplete_window.winfo_exists():
            self.autocomplete_window.destroy()
        if not search_text:
            return
        self.autocomplete_window = tk.Toplevel(self)
        self.autocomplete_window.wm_overrideredirect(True)
        x = self.search_entry.winfo_rootx()
        y = self.search_entry.winfo_rooty() + self.search_entry.winfo_height()
        self.autocomplete_window.wm_geometry(f"+{x}+{y}")
        listbox = tk.Listbox(self.autocomplete_window)
        listbox.pack()
        self.autocomplete_mapping = {}
        for f in self.get_all_json_files():
            fname = os.path.basename(f)
            if search_text in fname.lower():
                idx = listbox.size()
                listbox.insert(tk.END, fname)
                self.autocomplete_mapping[idx] = f
        listbox.bind("<Double-Button-1>", lambda e: self.open_selected_autocomplete_from_listbox(listbox))
        listbox.bind("<Return>", lambda e: self.open_selected_autocomplete_from_listbox(listbox))

    def focus_autocomplete_entry(self, event=None):
        if hasattr(self, 'autocomplete_window') and self.autocomplete_window.winfo_exists():
            lb = self.autocomplete_window.winfo_children()[0]
            lb.focus_set()
            lb.selection_clear(0, tk.END)
            lb.selection_set(0)
            lb.activate(0)

    def open_selected_autocomplete_entry(self, event=None):
        if hasattr(self, 'autocomplete_window') and self.autocomplete_window.winfo_exists():
            lb = self.autocomplete_window.winfo_children()[0]
            self.open_selected_autocomplete_from_listbox(lb)

    def open_selected_autocomplete_from_listbox(self, listbox):
        selection = listbox.curselection()
        if selection:
            idx = selection[0]
            path = self.autocomplete_mapping.get(idx)
            if path and os.path.isfile(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = json.load(f)
                except Exception as e:
                    messagebox.showerror("Error", f"Unable to open file:\n{e}")
                    return
                
                if self.current_form:
                    self.current_form.destroy()
                self.current_form = self.JSONFormFrame(self.form_frame_container, data=content)
                self.current_form.pack(fill=tk.BOTH, expand=True)
                self.current_file = path
                self.status_label.config(text=f"Editing: {os.path.basename(path)}")
        listbox.master.destroy()


    # =====================================================
    # ================= GENERATE BUILDS ==================
    # =====================================================
    def generate_builds(self):
        # Sélection des fichiers JSON dans builds
        builds_folder = os.path.abspath("builds")

        def select_builds():
            dlg = self.FileSelectorDialog(self, builds_folder, title="Select builds to generate", multiple=True)
            self.wait_window(dlg)
            return dlg.result

        selected = select_builds()
        if not selected:
            return

        failed = []
        for path in selected:
            name = os.path.splitext(os.path.basename(path))[0]
            cmd = ["node", "cv_generator.js", f"builds/{name}.json", "-o", name]
            try:
                subprocess.run(cmd, check=True)
            except subprocess.CalledProcessError:
                failed.append(name)

        if failed:
            messagebox.showerror("Generation Failed", f"Failed to generate: {', '.join(failed)}")
        else:
            messagebox.showinfo("Generation Completed", "All selected builds were generated successfully.")


if __name__ == "__main__":
    folders = ["./atoms", "./builds"]
    app = JSONEditorApp(folders)
    app.mainloop()