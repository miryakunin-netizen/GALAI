export function initFileUpload() {

    const input = document.getElementById("fileInput");

    if (!input) return;

    input.onchange = async () => {

        if (!input.files.length) return;

        const file = input.files[0];

        const form = new FormData();

        form.append("file", file);

        try {

            const r = await fetch("/api/upload", {
                method: "POST",
                body: form
            });

            const data = await r.json();

            console.log("UPLOAD", data);

            alert("Файл успешно загружен");

        } catch (e) {

            alert("Ошибка загрузки файла");

            console.error(e);

        }

    };

}
