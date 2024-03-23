const guepDB = {
  서기보: "9급",
  서기: "8급",
  주사보: "7급",
  주사: "6급",
};

// 순서조정함수
function up(e) {
  const prev = e.target.parentElement.previousElementSibling;
  if (!prev) return alert("맨 첫번째입니다");
  const current = e.target.parentElement;
  const origin = JSON.parse(localStorage.getItem("order"));

  const cur_index = origin.indexOf(current.getAttribute("data-name"));
  const prev_index = origin.indexOf(prev.getAttribute("data-name"));

  // 기존제거
  origin.splice(cur_index, 1);
  origin.splice(prev_index, 1);

  // 신규추가
  origin.splice(cur_index, 0, prev.getAttribute("data-name"));
  origin.splice(prev_index, 0, current.getAttribute("data-name"));
  localStorage.setItem("order", JSON.stringify(origin));
  render();
}

function down(e) {
  const next = e.target.parentElement.nextElementSibling;
  if (!next) return alert("마지막입니다");
  const current = e.target.parentElement;
  const origin = JSON.parse(localStorage.getItem("order"));

  const cur_index = origin.indexOf(current.getAttribute("data-name"));
  const next_index = origin.indexOf(next.getAttribute("data-name"));

  // 기존제거
  origin.splice(next_index, 1);
  origin.splice(cur_index, 1);

  // 신규추가
  origin.splice(cur_index, 0, next.getAttribute("data-name"));
  origin.splice(next_index, 0, current.getAttribute("data-name"));
  localStorage.setItem("order", JSON.stringify(origin));
  render();
}

function orderDelete(e) {
  const renderData = getData();
  const target = e.target.parentElement.getAttribute("data-name");
  const filteredOrder = JSON.parse(localStorage.getItem("order")).filter(
    (item) => item !== target
  );
  const filteredWorkLogs = JSON.parse(localStorage.getItem("workLogs")).filter(
    (item) => item.name !== target.split(" ")[1]
  );
  const d = renderData.map(({ date, day, people }) => {
    return {
      date,
      day,
      people: people.filter((item) => item.person !== target),
    };
  });
  localStorage.setItem("order", JSON.stringify(filteredOrder));
  localStorage.setItem("workLogs", JSON.stringify(filteredWorkLogs));
  setData(d);
  render();
}

/**메인 데이터를 가져오는 함수 */
function getData() {
  const year = localStorage.getItem("year");
  const month = localStorage.getItem("month");
  const data = localStorage.getItem(`${year}-${month}`);
  if (data) {
    return JSON.parse(data);
  } else {
    const result = [];
    const lastDate = new Date(year, Number(month) + 1, 0).getDate();
    for (let i = 0; i < lastDate; i++) {
      result.push({
        date: i + 1,
        day: new Date(year, month, i + 1).getDay(),
        people: [],
      });
    }
    localStorage.setItem(`${year}-${month}`, JSON.stringify(result));
    return result;
  }
}

/**메인데이터를 저장하는 함수 */
function setData(data) {
  const year = localStorage.getItem("year");
  const month = localStorage.getItem("month");
  localStorage.setItem(`${year}-${month}`, JSON.stringify(data));
}

// 엑셀을 읽는 함수
function readExcel(file) {
  return new Promise((resolve, reject) => {
    const year = Number(localStorage.getItem("year"));
    const month = Number(localStorage.getItem("month"));
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    fileReader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet);
      const result = {
        workDate: [],
      };

      try {
        if (json[0].__EMPTY_4.indexOf("초과근무") === -1) reject("Error");
      } catch (error) {
        reject("Error");
      }

      for (let i = 3; i < json.length - 1; i++) {
        const data = json[i];
        if (
          Number(data.__EMPTY_1.split("-")[0]) !== year ||
          Number(data.__EMPTY_1.split("-")[1]) !== month + 1
        )
          reject("notMatch");

        if (!result.name) result.name = data.__EMPTY_6;
        if (!result.degree) result.degree = toSimpleDegree(data.__EMPTY_3);
        if (!result.workLog) result.workLog = data.__EMPTY_13;
        const workDate = Number(data.__EMPTY_1.split("-")[2]);
        result.workDate.push({ workDate, workTime: Number(data.__EMPTY_9) });
      }
      resolve(result);
    };
  });
}

/**지방공업서기보 -> 공업9급 으로 만드는 함수 */
function toSimpleDegree(degree) {
  const noJibang = degree.replace(/\지방/g, "");
  let jickRuel, guep;

  switch (noJibang.length) {
    case 7:
      jickRuel = noJibang.substr(0, 4);
      guep = guepDB[noJibang.substr(4)];
      break;
    case 6:
      jickRuel = noJibang.substr(0, 4);
      guep = guepDB[noJibang.substr(4)];
      break;
    case 5:
      jickRuel = noJibang.substr(0, 2);
      guep = guepDB[noJibang.substr(2)];
      break;
    case 4:
      jickRuel = noJibang.substr(0, 2);
      guep = guepDB[noJibang.substr(2)];
      break;
  }

  return `${jickRuel}${guep}`;
}

// 렌더링 함수
function render() {
  const renderData = getData();
  const orderArr = JSON.parse(localStorage.getItem("order")) ?? [];
  const dateRow = document.querySelector("#date-row");
  const totalRow = document.querySelector("#total-row");
  const period = document.querySelector("#period");
  const tbody = document.querySelector("tbody");
  const year = localStorage.getItem("year");
  const colorCode = localStorage.getItem("color");
  const month = Number(localStorage.getItem("month"));
  const teamName = localStorage.getItem("team-name");
  period.colSpan = renderData.length;
  period.innerText = `${year}. ${month + 1}. 1. 부터 ~ ${year}. ${month + 1}. ${
    renderData[renderData.length - 1].date
  }. 까지`;
  tbody.innerHTML = "";
  dateRow.innerHTML = "";
  totalRow.innerHTML = "";

  let teamTotal = 0;

  if (colorCode) {
    document.querySelector("thead").style.setProperty("--th-color", colorCode);
  }

  document.querySelector(
    "#table-title"
  ).innerText = `${teamName} 특근급식비 지급명세서`;

  // 급식내역 및 날짜렌더링
  const orderList = document.querySelector("#order-list");
  orderList.innerHTML = "";
  orderArr.forEach((worker, workerIndex) => {
    const tr = document.createElement("tr");
    const [degree, name] = worker.split(" ");
    let total = 0;
    tr.innerHTML = `
        <td>${degree}</td>
        <td>${name}</td>
        `;
    orderList.innerHTML += `
    <div class="order-item" data-name="${worker}">
      <span>${worker}</span>
      <div class='up' onclick="up(event)"></div>
      <div class='down' onclick="down(event)"></div>
      <div class='delete' onclick="orderDelete(event)"></div>
    </div>
  `;
    renderData.forEach(({ people, date, day }, dataIndex) => {
      // 날짜행 렌더
      if (workerIndex === 0) {
        if (dataIndex === 0)
          totalRow.innerHTML += `<td>계</td><td>${orderArr.length}명</td>`;

        let smallTotal = 0;
        if (people.length !== 0) {
          if (day === 0 || day === 6) {
            smallTotal = people.filter((item) => item.workTime >= 60).length;
          } else {
            smallTotal = people.length;
          }
        }
        totalRow.innerHTML += `<td>${smallTotal}</td>`;
        teamTotal += smallTotal;
        dateRow.innerHTML += `<td class=${
          day === 0 ? "sunday" : day === 6 ? "saturday" : ""
        }>${date}</td>`;
      }

      // 각 직원 렌더
      const target = people.filter(
        (item) => item.person === `${degree} ${name}`
      )[0];
      if (!target) {
        tr.innerHTML += "<td></td>";
      } else {
        if (day === 0 || day === 6) {
          if (target.workTime >= 60) {
            tr.innerHTML += "<td>1</td>";
            total++;
          } else {
            tr.innerHTML += "<td></td>";
          }
        } else {
          tr.innerHTML += "<td>1</td>";
          total++;
        }
      }
    });

    tr.innerHTML += `
    <td>${total}</td>
    <td>8,000</td>
    <td>${String(total * 8000).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
    <td></td>
  `;
    if (workerIndex === orderArr.length - 1) {
      totalRow.innerHTML += `
      <td>${teamTotal}</td> 
      <td>8,000</td> 
      <td>${String(teamTotal * 8000).replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ","
      )}</td> 
      <td></td> 
    `;
    }
    tbody.append(tr);
  });

  tbody.innerHTML += `
  <tr id="checker">
    <td colspan="37">확인자 : ${localStorage.getItem(
      "degree"
    )} ${localStorage.getItem("name")} (인)</td>
  </tr>
  `;
}

// 맨처음 담당자 이름, 직급, 팀명 입력하는거
document.querySelector("#input-button").addEventListener("click", () => {
  const degree = document.querySelector("#degree").value;
  const name = document.querySelector("#name").value;
  const teamName = document.querySelector("#team-name").value;
  if (!degree || !name || !teamName) return alert("제대로 입력하세요");
  localStorage.setItem("degree", degree);
  localStorage.setItem("name", name);
  localStorage.setItem("team-name", teamName);
  document.querySelector("#info-receive").style.display = "none";
  document.querySelector("section").style.display = "block";
  document.querySelector("header").style.display = "block";
  render();
});

document.querySelector("#team-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    (() => {
      const degree = document.querySelector("#degree").value;
      const name = document.querySelector("#name").value;
      const teamName = document.querySelector("#team-name").value;
      if (!degree || !name || !teamName) return alert("제대로 입력하세요");
      localStorage.setItem("degree", degree);
      localStorage.setItem("name", name);
      localStorage.setItem("team-name", teamName);
      document.querySelector("#info-receive").style.display = "none";
      document.querySelector("section").style.display = "block";
      document.querySelector("header").style.display = "block";
      render();
    })();
  }
});

// 엑셀 입력 이벤트
document.querySelector("#excel").addEventListener("input", async (e) => {
  const files = Array.from(e.target.files);
  const jsons = files.map((file) => readExcel(file));
  try {
    const result = await Promise.all(jsons);
    const origin = getData();
    const order = JSON.parse(localStorage.getItem("order")) ?? [];
    const workLogs = JSON.parse(localStorage.getItem("workLogs")) ?? [];
    result.forEach(({ degree, name, workDate, workLog }) => {
      const matchWorkLog = workLogs.filter((item) => item.name === name)[0];

      if (order.indexOf(`${degree} ${name}`) === -1)
        order.push(`${degree} ${name}`);
      // 근무내역이 변경될경우 덮어씌우는 부분
      if (!matchWorkLog) workLogs.push({ name, workLog });
      else {
        if (matchWorkLog.workLog !== workLog) {
          workLogs.forEach((item) => {
            if (item.name === name) {
              item.workLog = workLog;
            }
          });
        }
      }

      workDate.forEach((data, i) => {
        if (
          origin[data.workDate - 1].people.filter(
            (item) => item.person === `${degree} ${name}`
          ).length !== 0
        )
          return;
        origin[data.workDate - 1].people.push({
          person: `${degree} ${name}`,
          workTime: data.workTime,
        });
      });
    });
    setData(origin);
    localStorage.setItem("order", JSON.stringify(order));
    localStorage.setItem("workLogs", JSON.stringify(workLogs));
    e.target.value = "";
    render();
  } catch (error) {
    console.log(error);
    if (error === "notMatch") {
      return alert("설정하신 달과 입력하시려는 파일의 달이 다릅니다.");
    }
    if (error === "Error") {
      return alert("양식이 맞지 않습니다.");
    }
  }
});

// 첫로드시 렌더링
window.addEventListener("load", () => {
  const degree = localStorage.getItem("degree");
  const name = localStorage.getItem("name");
  const teamName = localStorage.getItem("team-name");
  if (!degree || !name || !teamName)
    document.querySelector("#info-receive").style.display = "block";
  else {
    document.querySelector("section").style.display = "block";
    document.querySelector("header").style.display = "block";
  }
  const year = localStorage.getItem("year");
  const month = localStorage.getItem("month");
  if (!year || !month) {
    const today = new Date();
    localStorage.setItem("year", today.getFullYear());
    localStorage.setItem("month", today.getMonth() - 1);
  }
  render();
});
// 유틸버튼 이벤트 부착
document
  .querySelector("#print")
  .addEventListener("click", () => window.print());
document.querySelector("#prev").addEventListener("click", () => {
  const year = Number(localStorage.getItem("year"));
  const month = Number(localStorage.getItem("month"));
  let prevYear;
  let prevMonth;
  if (month - 1 == -1) {
    prevMonth = 11;
    prevYear = year - 1;
    localStorage.setItem("year", prevYear);
  } else {
    prevMonth = month - 1;
  }
  localStorage.setItem("month", prevMonth);
  render();
});
document.querySelector("#next").addEventListener("click", () => {
  const year = Number(localStorage.getItem("year"));
  const month = Number(localStorage.getItem("month"));
  let nextYear;
  let nextMonth;
  if (month + 1 == 12) {
    nextMonth = 0;
    nextYear = year + 1;
    localStorage.setItem("year", nextYear);
  } else {
    nextMonth = month + 1;
  }
  localStorage.setItem("month", nextMonth);
  render();
});

document.querySelector("#setting-open").addEventListener("click", () => {
  document.querySelector("#setting-modal").classList.add("open");
  const originName = localStorage.getItem("name");
  const originDegree = localStorage.getItem("degree");
  const originTeamName = localStorage.getItem("team-name");
  const originColor = localStorage.getItem("color") ?? "#f0f8ff";
  const [degreeInput, nameInput, teamNameInput, colorInput] =
    document.querySelectorAll("#setting input");

  degreeInput.value = originDegree;
  nameInput.value = originName;
  teamNameInput.value = originTeamName;
  colorInput.value = originColor;
});

document.querySelector("#setting-close").addEventListener("click", () => {
  document.querySelector("#setting-modal").classList.remove("open");
});

document.querySelector("#revise-button").addEventListener("click", () => {
  const [degreeInput, nameInput, teamNameInput, colorInput] =
    document.querySelectorAll("#setting input");
  localStorage.setItem("degree", degreeInput.value);
  localStorage.setItem("name", nameInput.value);
  localStorage.setItem("team-name", teamNameInput.value);
  localStorage.setItem("color", colorInput.value);
  document.querySelector("#setting-modal").classList.remove("open");
  render();
});

document.querySelector("#date-row").addEventListener("click", (e) => {
  if (e.target.tagName === "TD") {
    const targetDate = Number(e.target.innerText);
    const renderData = getData();
    renderData.forEach((item) => {
      if (item.date === targetDate) {
        if (item.day === 0) {
          const year = localStorage.getItem("year");
          const month = localStorage.getItem("month");
          console.log(year, month);
          item.day = new Date(year, month, item.date).getDay();
        } else {
          item.day = 0;
        }
      }
    });
    setData(renderData);
    render();
  }
});
