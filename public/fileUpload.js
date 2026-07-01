export function initFileUpload() {
  const input = document.getElementById("fileInput");
  const status = document.getElementById("uploadStatus");

  if (!input) return;

  input.onchange = async () => {
    if (!input.files.length) return;

    const file = input.files[0];

    if (status) {
      status.innerHTML = `📄 Загружается: <b>${file.name}</b>...`;
    }

    const form = new FormData();
    form.append("file", file);

    try {
      const r = await fetch("/api/upload", {
        method: "POST",
        body: form
      });

      const data = await r.json();

      console.log("UPLOAD", data);

      if (!r.ok || data.ok === false) {
        throw new Error(data.error || "Ошибка загрузки");
      }

      if (status) {
        status.innerHTML = `✅ <b>${file.name}</b><br>Документ загружен`;
      }
    } catch (e) {
      console.error(e);

      if (status) {
        status.innerHTML = "❌ Ошибка загрузки документа";
      }
    }
  };
}
